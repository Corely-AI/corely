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
  CancelInventoryDocumentInput,
  CancelInventoryDocumentOutput,
} from "@corely/contracts";
import { toInventoryDocumentDto } from "../mappers/inventory-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { DocumentDeps } from "./inventory-document.deps";

@RequireTenant()
export class CancelInventoryDocumentUseCase extends BaseUseCase<
  CancelInventoryDocumentInput,
  CancelInventoryDocumentOutput
> {
  constructor(private readonly documentDeps: DocumentDeps) {
    super({ logger: documentDeps.logger });
  }

  protected async handle(
    input: CancelInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelInventoryDocumentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<CancelInventoryDocumentOutput>({
      idempotency: this.documentDeps.idempotency,
      actionKey: "inventory.cancel-document",
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

    const now = this.documentDeps.clock.now();
    try {
      document.cancel(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    if (document.documentType === "DELIVERY") {
      await this.documentDeps.reservationRepo.releaseByDocument(tenantId, document.id, now);
    }

    await this.documentDeps.repo.save(tenantId, document);
    await this.documentDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.document.canceled",
      entityType: "InventoryDocument",
      entityId: document.id,
      metadata: { documentType: document.documentType },
    });

    const result = { document: toInventoryDocumentDto(document) };
    await storeIdempotentResult({
      idempotency: this.documentDeps.idempotency,
      actionKey: "inventory.cancel-document",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
