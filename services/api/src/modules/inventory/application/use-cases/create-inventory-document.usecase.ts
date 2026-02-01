import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type {
  CreateInventoryDocumentInput,
  CreateInventoryDocumentOutput,
} from "@corely/contracts";
import { InventoryDocumentAggregate } from "../../domain/inventory-document.aggregate";
import { toInventoryDocumentDto } from "../mappers/inventory-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import {
  buildLineItems,
  validateProducts,
  validateLineLocations,
  localDateFromIso,
} from "./inventory-document.helpers";
import type { DocumentDeps } from "./inventory-document.deps";

@RequireTenant()
export class CreateInventoryDocumentUseCase extends BaseUseCase<
  CreateInventoryDocumentInput,
  CreateInventoryDocumentOutput
> {
  constructor(private readonly documentDeps: DocumentDeps) {
    super({ logger: documentDeps.logger });
  }

  protected async handle(
    input: CreateInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInventoryDocumentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<CreateInventoryDocumentOutput>({
      idempotency: this.documentDeps.idempotency,
      actionKey: "inventory.create-document",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const settings = await this.documentDeps.settingsRepo.findByTenant(tenantId);
    let lineItems = buildLineItems({
      idGenerator: this.documentDeps.idGenerator,
      lineItems: input.lineItems,
    });

    await validateProducts({
      tenantId,
      productRepo: this.documentDeps.productRepo,
      lines: lineItems,
    });
    lineItems = await validateLineLocations({
      tenantId,
      documentType: input.documentType,
      lines: lineItems,
      settings,
      warehouseRepo: this.documentDeps.warehouseRepo,
      locationRepo: this.documentDeps.locationRepo,
    });

    const now = this.documentDeps.clock.now();
    const document = InventoryDocumentAggregate.createDraft({
      id: this.documentDeps.idGenerator.newId(),
      tenantId,
      documentType: input.documentType,
      reference: input.reference ?? null,
      scheduledDate: localDateFromIso(input.scheduledDate),
      postingDate: localDateFromIso(input.postingDate),
      notes: input.notes ?? null,
      partyId: input.partyId ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      lines: lineItems,
      now,
    });

    await this.documentDeps.repo.create(tenantId, document);
    await this.documentDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.document.created",
      entityType: "InventoryDocument",
      entityId: document.id,
      metadata: { documentType: document.documentType },
    });

    const result = { document: toInventoryDocumentDto(document) };
    await storeIdempotentResult({
      idempotency: this.documentDeps.idempotency,
      actionKey: "inventory.create-document",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
