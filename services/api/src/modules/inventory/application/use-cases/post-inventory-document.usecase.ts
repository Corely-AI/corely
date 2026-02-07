import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  parseLocalDate,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { PostInventoryDocumentInput, PostInventoryDocumentOutput } from "@corely/contracts";
import type { StockMove } from "../../domain/inventory.types";
import { InventorySettingsAggregate } from "../../domain/settings.aggregate";
import { toInventoryDocumentDto } from "../mappers/inventory-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import { resolvePostingDate, requireLocation } from "./inventory-document.helpers";
import type { DocumentDeps } from "./inventory-document.deps";
import { createInventoryLot } from "../../domain/inventory-lot.entity";
import {
  validateLotTrackingRequirements,
  resolveExpiryDate,
} from "../../domain/inventory-rules";

@RequireTenant()
export class PostInventoryDocumentUseCase extends BaseUseCase<
  PostInventoryDocumentInput,
  PostInventoryDocumentOutput
> {
  constructor(private readonly documentDeps: DocumentDeps) {
    super({ logger: documentDeps.logger });
  }

  protected async handle(
    input: PostInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<PostInventoryDocumentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<PostInventoryDocumentOutput>({
      idempotency: this.documentDeps.idempotency,
      actionKey: "inventory.post-document",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const document = await this.documentDeps.repo.findById(tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    let settings = await this.documentDeps.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      settings = InventorySettingsAggregate.createDefault({
        id: this.documentDeps.idGenerator.newId(),
        tenantId,
        now: this.documentDeps.clock.now(),
      });
    }

    const postingDate = resolvePostingDate({
      postingDate: input.postingDate,
      documentPostingDate: document.postingDate ?? null,
    });

    const postingLocalDate = parseLocalDate(postingDate);
    const moves: StockMove[] = [];

    // For receipts, we need to validate lot tracking requirements and create lots
    const lotMap = new Map<string, string>(); // lineId -> lotId mapping

    if (document.documentType === "RECEIPT") {
      // Fetch catalog items for all products in this document
      const productIds = [...new Set(document.lines.map((line) => line.productId))];
      const catalogItems = new Map<string, any>();

      for (const productId of productIds) {
        // Find product to get catalog item reference
        const product = await this.documentDeps.productRepo.findById(tenantId, productId);
        if (!product) {
          return err(new NotFoundError(`Product not found: ${productId}`));
        }

        // Get catalog item if product is linked to catalog
        // Assuming products have a catalogItemId or similar field
        // For now, we'll fetch by matching product SKU to catalog code
        try {
          const catalogItem = await this.documentDeps.catalogRepo.findItemByCode(
            { tenantId, workspaceId: ctx.workspaceId || tenantId },
            product.sku
          );
          if (catalogItem) {
            catalogItems.set(productId, catalogItem);
          }
        } catch (error) {
          // Catalog item not found - product may not be in catalog, continue without lot tracking
          this.documentDeps.logger.warn(`Catalog item not found for product ${productId}`);
        }
      }

      // Validate and create lots for each line
      for (const line of document.lines) {
        const catalogItem = catalogItems.get(line.productId);

        if (catalogItem) {
          // Validate lot tracking requirements
          try {
            validateLotTrackingRequirements(catalogItem, line);
          } catch (error) {
            return err(error as ValidationError);
          }

          // Create lot if lot tracking is enabled
          if (catalogItem.requiresLotTracking && line.lotNumber) {
            // Check for duplicate lot number
            const existingLot = await this.documentDeps.lotRepo.findByLotNumber(
              tenantId,
              line.productId,
              line.lotNumber
            );

            if (existingLot) {
              return err(
                new ValidationError(
                  `Lot number ${line.lotNumber} already exists for this product`,
                  { productId: line.productId, lotNumber: line.lotNumber }
                )
              );
            }

            // Resolve expiry date
            const expiryDate = resolveExpiryDate(
              line.mfgDate ?? null,
              line.expiryDate ?? null,
              catalogItem.shelfLifeDays
            );

            // Create the lot
            const now = this.documentDeps.clock.now();
            const lot = createInventoryLot({
              id: this.documentDeps.idGenerator.newId(),
              tenantId,
              productId: line.productId,
              lotNumber: line.lotNumber,
              mfgDate: line.mfgDate ? parseLocalDate(line.mfgDate) : null,
              expiryDate: expiryDate ? parseLocalDate(expiryDate) : null,
              receivedDate: postingLocalDate,
              shipmentId: document.sourceType === "SHIPMENT" ? document.sourceId : null,
              supplierPartyId: document.partyId ?? null,
              unitCostCents: line.unitCostCents ?? null,
              qtyReceived: line.quantity,
              status: "AVAILABLE",
              notes: line.notes ?? null,
              metadataJson: null,
              createdAt: now,
              updatedAt: now,
            });

            await this.documentDeps.lotRepo.create(tenantId, lot);
            lotMap.set(line.id, lot.id);

            await this.documentDeps.audit.log({
              tenantId,
              userId: ctx.userId,
              action: "inventory.lot.created",
              entityType: "InventoryLot",
              entityId: lot.id,
              metadata: { documentId: document.id, lineId: line.id },
            });
          }
        }
      }
    }

    if (
      (document.documentType === "DELIVERY" || document.documentType === "TRANSFER") &&
      settings.toProps().negativeStockPolicy === "DISALLOW"
    ) {
      const productIds = document.lines.map((line) => line.productId);
      const locationIds = document.lines
        .map((line) => line.fromLocationId)
        .filter((value): value is string => Boolean(value));

      const onHand = await this.documentDeps.moveRepo.sumByProductLocation(tenantId, {
        productIds,
        locationIds,
      });
      const onHandMap = new Map<string, number>();
      const key = (productId: string, locationId: string) => `${productId}:${locationId}`;
      onHand.forEach((row) => {
        onHandMap.set(key(row.productId, row.locationId), row.quantityDelta);
      });

      const shortages: Array<{
        lineId: string;
        productId: string;
        locationId: string;
        requested: number;
        available: number;
      }> = [];

      for (const line of document.lines) {
        const fromLocationId = line.fromLocationId;
        if (!fromLocationId) {
          return err(
            new ValidationError("fromLocationId is required", undefined, "LOCATION_REQUIRED")
          );
        }
        const available = onHandMap.get(key(line.productId, fromLocationId)) ?? 0;
        if (available - line.quantity < 0) {
          shortages.push({
            lineId: line.id,
            productId: line.productId,
            locationId: fromLocationId,
            requested: line.quantity,
            available,
          });
        }
      }

      if (shortages.length) {
        return err(
          new ValidationError(
            "Negative stock not allowed",
            { shortages },
            "NEGATIVE_STOCK_NOT_ALLOWED"
          )
        );
      }
    }

    for (const line of document.lines) {
      if (document.documentType === "RECEIPT") {
        requireLocation(line.toLocationId, "toLocationId");
        moves.push({
          id: this.documentDeps.idGenerator.newId(),
          tenantId,
          postingDate: postingLocalDate,
          productId: line.productId,
          quantityDelta: line.quantity,
          locationId: line.toLocationId!,
          documentType: document.documentType,
          documentId: document.id,
          lineId: line.id,
          reasonCode: "RECEIPT",
          lotId: lotMap.get(line.id) ?? null,
          createdAt: this.documentDeps.clock.now(),
          createdByUserId: ctx.userId,
        });
      }

      if (document.documentType === "DELIVERY") {
        requireLocation(line.fromLocationId, "fromLocationId");
        moves.push({
          id: this.documentDeps.idGenerator.newId(),
          tenantId,
          postingDate: postingLocalDate,
          productId: line.productId,
          quantityDelta: -line.quantity,
          locationId: line.fromLocationId!,
          documentType: document.documentType,
          documentId: document.id,
          lineId: line.id,
          reasonCode: "SHIPMENT",
          lotId: null,
          createdAt: this.documentDeps.clock.now(),
          createdByUserId: ctx.userId,
        });
      }

      if (document.documentType === "TRANSFER") {
        requireLocation(line.fromLocationId, "fromLocationId");
        requireLocation(line.toLocationId, "toLocationId");
        moves.push({
          id: this.documentDeps.idGenerator.newId(),
          tenantId,
          postingDate: postingLocalDate,
          productId: line.productId,
          quantityDelta: -line.quantity,
          locationId: line.fromLocationId!,
          documentType: document.documentType,
          documentId: document.id,
          lineId: line.id,
          reasonCode: "TRANSFER",
          lotId: null,
          createdAt: this.documentDeps.clock.now(),
          createdByUserId: ctx.userId,
        });
        moves.push({
          id: this.documentDeps.idGenerator.newId(),
          tenantId,
          postingDate: postingLocalDate,
          productId: line.productId,
          quantityDelta: line.quantity,
          locationId: line.toLocationId!,
          documentType: document.documentType,
          documentId: document.id,
          lineId: line.id,
          reasonCode: "TRANSFER",
          lotId: null,
          createdAt: this.documentDeps.clock.now(),
          createdByUserId: ctx.userId,
        });
      }

      if (document.documentType === "ADJUSTMENT") {
        if (line.toLocationId) {
          moves.push({
            id: this.documentDeps.idGenerator.newId(),
            tenantId,
            postingDate: postingLocalDate,
            productId: line.productId,
            quantityDelta: line.quantity,
            locationId: line.toLocationId,
            documentType: document.documentType,
            documentId: document.id,
            lineId: line.id,
            reasonCode: "ADJUSTMENT",
            lotId: null,
            createdAt: this.documentDeps.clock.now(),
            createdByUserId: ctx.userId,
          });
        } else if (line.fromLocationId) {
          moves.push({
            id: this.documentDeps.idGenerator.newId(),
            tenantId,
            postingDate: postingLocalDate,
            productId: line.productId,
            quantityDelta: -line.quantity,
            locationId: line.fromLocationId,
            documentType: document.documentType,
            documentId: document.id,
            lineId: line.id,
            reasonCode: "ADJUSTMENT",
            lotId: null,
            createdAt: this.documentDeps.clock.now(),
            createdByUserId: ctx.userId,
          });
        }
      }
    }

    const now = this.documentDeps.clock.now();
    document.setPostingDate(postingLocalDate, now);
    try {
      document.post(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.documentDeps.moveRepo.createMany(tenantId, moves);

    if (document.documentType === "DELIVERY") {
      await this.documentDeps.reservationRepo.fulfillByDocument(tenantId, document.id, now);
    }

    await this.documentDeps.repo.save(tenantId, document);
    await this.documentDeps.settingsRepo.save(settings);

    await this.documentDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.document.posted",
      entityType: "InventoryDocument",
      entityId: document.id,
      metadata: { documentType: document.documentType },
    });

    const result = { document: toInventoryDocumentDto(document) };
    await storeIdempotentResult({
      idempotency: this.documentDeps.idempotency,
      actionKey: "inventory.post-document",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
