import { Inject, Injectable } from "@nestjs/common";
import type { AttachBelegInput } from "@corely/contracts";
import {
  AUDIT_PORT,
  BaseUseCase,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  NotFoundError,
  ValidationError,
  type AuditPort,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import {
  CASH_ATTACHMENT_REPO,
  CASH_DOCUMENTS_PORT,
  CASH_ENTRY_REPO,
  type CashAttachmentRepoPort,
  type CashEntryRepoPort,
  type DocumentsPort,
} from "../ports/cash-management.ports";
import { toAttachmentDto } from "../cash-management.mapper";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { getIdempotentBody, storeIdempotentBody } from "./idempotency";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

const ACTION_KEY = "cash-management.entry.attach-beleg";

@RequireTenant()
@Injectable()
export class AttachBelegToCashEntryUseCase extends BaseUseCase<
  AttachBelegInput,
  { attachment: ReturnType<typeof toAttachmentDto> }
> {
  constructor(
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_ATTACHMENT_REPO)
    private readonly attachmentRepo: CashAttachmentRepoPort,
    @Inject(CASH_DOCUMENTS_PORT)
    private readonly documentsPort: DocumentsPort,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT)
    private readonly outbox: OutboxPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotencyStore: IdempotencyStoragePort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: AttachBelegInput,
    ctx: UseCaseContext
  ): Promise<Result<{ attachment: ReturnType<typeof toAttachmentDto> }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const cached = await getIdempotentBody<{ attachment: ReturnType<typeof toAttachmentDto> }>({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const entry = await this.entryRepo.findEntryById(tenantId, workspaceId, input.entryId);
    if (!entry) {
      throw new NotFoundError("Cash entry not found", undefined, "CashManagement:EntryNotFound");
    }

    assertCanManageCash(ctx, entry.registerId);

    const documentId = input.documentId ?? input.uploadToken ?? input.fileId;
    if (!documentId) {
      throw new ValidationError(
        "documentId (or compatible token) is required",
        undefined,
        "CashManagement:InvalidInput"
      );
    }

    await this.documentsPort.assertDocumentAccessible(tenantId, documentId);

    const existing = await this.attachmentRepo.findAttachmentByEntryAndDocument(
      tenantId,
      workspaceId,
      entry.id,
      documentId
    );

    if (existing) {
      const response = { attachment: toAttachmentDto(existing) };
      await storeIdempotentBody({
        idempotency: this.idempotencyStore,
        tenantId,
        actionKey: ACTION_KEY,
        idempotencyKey: input.idempotencyKey,
        body: response,
      });
      return ok(response);
    }

    const attachment = await this.unitOfWork.withinTransaction(async (tx) => {
      const created = await this.attachmentRepo.createAttachment(
        {
          tenantId,
          workspaceId,
          entryId: entry.id,
          documentId,
          uploadedByUserId: ctx.userId ?? null,
        },
        tx
      );

      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "cash.entry.attachment.added",
          entityType: "CashEntryAttachment",
          entityId: created.id,
          metadata: {
            entryId: entry.id,
            documentId,
          },
        },
        tx
      );

      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "cash.entry.attachment.added",
          payload: {
            entryId: entry.id,
            attachmentId: created.id,
            documentId,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      return created;
    });

    const response = { attachment: toAttachmentDto(attachment) };
    await storeIdempotentBody({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
      body: response,
    });

    return ok(response);
  }
}
