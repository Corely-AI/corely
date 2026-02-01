import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type {
  ConfirmInventoryDocumentInput,
  ConfirmInventoryDocumentOutput,
} from "@corely/contracts";
import { InventorySettingsAggregate } from "../../domain/settings.aggregate";
import { toInventoryDocumentDto } from "../mappers/inventory-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import { allocateUniqueNumber } from "./numbering";
import type { DocumentDeps } from "./inventory-document.deps";

@RequireTenant()
export class ConfirmInventoryDocumentUseCase extends BaseUseCase<
  ConfirmInventoryDocumentInput,
  ConfirmInventoryDocumentOutput
> {
  constructor(private readonly documentDeps: DocumentDeps) {
    super({ logger: documentDeps.logger });
  }

  protected async handle(
    input: ConfirmInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<ConfirmInventoryDocumentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<ConfirmInventoryDocumentOutput>({
      idempotency: this.documentDeps.idempotency,
      actionKey: "inventory.confirm-document",
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

    const documentNumber = await allocateUniqueNumber({
      next: () => settings!.allocateDocumentNumber(document.documentType),
      isTaken: (candidate) => this.documentDeps.repo.isDocumentNumberTaken(tenantId, candidate),
    });

    const now = this.documentDeps.clock.now();
    try {
      document.confirm(documentNumber, now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    if (document.documentType === "DELIVERY") {
      const shortages: Array<{
        lineId: string;
        productId: string;
        locationId: string;
        requested: number;
        available: number;
      }> = [];

      const productIds = document.lines.map((line) => line.productId);
      const locationIds = document.lines.map((line) => line.fromLocationId!).filter(Boolean);

      const onHand = await this.documentDeps.moveRepo.sumByProductLocation(tenantId, {
        productIds,
        locationIds,
      });
      const reserved = await this.documentDeps.reservationRepo.sumActiveByProductLocation(
        tenantId,
        {
          productIds,
          locationIds,
        }
      );

      const key = (productId: string, locationId: string) => `${productId}:${locationId}`;
      const onHandMap = new Map<string, number>();
      const reservedMap = new Map<string, number>();

      onHand.forEach((row) => {
        onHandMap.set(key(row.productId, row.locationId), row.quantityDelta);
      });
      reserved.forEach((row) => {
        reservedMap.set(key(row.productId, row.locationId), row.reservedQty);
      });

      document.lines = document.lines.map((line) => {
        const locationId = line.fromLocationId!;
        const availableQty =
          (onHandMap.get(key(line.productId, locationId)) ?? 0) -
          (reservedMap.get(key(line.productId, locationId)) ?? 0);

        if (availableQty < line.quantity) {
          shortages.push({
            lineId: line.id,
            productId: line.productId,
            locationId,
            requested: line.quantity,
            available: availableQty,
          });
        }

        return { ...line, reservedQuantity: line.quantity };
      });

      if (shortages.length) {
        return err(
          new ValidationError("Insufficient stock to reserve", { shortages }, "RESERVATION_FAILED")
        );
      }

      const reservations = document.lines.map((line) => ({
        id: this.documentDeps.idGenerator.newId(),
        tenantId,
        productId: line.productId,
        locationId: line.fromLocationId!,
        documentId: document.id,
        reservedQty: line.quantity,
        status: "ACTIVE" as const,
        createdAt: now,
        releasedAt: null,
        fulfilledAt: null,
        createdByUserId: ctx.userId!,
      }));

      await this.documentDeps.reservationRepo.createMany(tenantId, reservations);
    }

    await this.documentDeps.repo.save(tenantId, document);
    await this.documentDeps.settingsRepo.save(settings);

    await this.documentDeps.audit.log({
      tenantId,
      userId: ctx.userId!,
      action: "inventory.document.confirmed",
      entityType: "InventoryDocument",
      entityId: document.id,
      metadata: { documentType: document.documentType, documentNumber },
    });

    const result = { document: toInventoryDocumentDto(document) };
    await storeIdempotentResult({
      idempotency: this.documentDeps.idempotency,
      actionKey: "inventory.confirm-document",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
