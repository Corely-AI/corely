import { Inject, Injectable } from "@nestjs/common";
import type { ExportCashBookInput, ExportCashBookOutput } from "@corely/contracts";
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
  CASH_DAY_CLOSE_REPO,
  CASH_ENTRY_REPO,
  CASH_EXPORT_PORT,
  CASH_EXPORT_REPO,
  CASH_REGISTER_REPO,
  type CashAttachmentRepoPort,
  type CashDayCloseRepoPort,
  type CashEntryRepoPort,
  type CashExportRepoPort,
  type CashRegisterRepoPort,
  type ExportPort,
} from "../ports/cash-management.ports";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { getIdempotentBody, storeIdempotentBody } from "./idempotency";
import { assertCanExportCash } from "../../policies/assert-cash-policies";

const ACTION_KEY = "cash-management.export.generate";

@RequireTenant()
@Injectable()
export class ExportCashBookUseCase extends BaseUseCase<
  ExportCashBookInput,
  { export: ExportCashBookOutput }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort,
    @Inject(CASH_ATTACHMENT_REPO)
    private readonly attachmentRepo: CashAttachmentRepoPort,
    @Inject(CASH_EXPORT_REPO)
    private readonly exportRepo: CashExportRepoPort,
    @Inject(CASH_EXPORT_PORT)
    private readonly exportPort: ExportPort,
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
    input: ExportCashBookInput,
    ctx: UseCaseContext
  ): Promise<Result<{ export: ExportCashBookOutput }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    assertCanExportCash(ctx, input.registerId);

    const cached = await getIdempotentBody<{ export: ExportCashBookOutput }>({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      input.registerId
    );
    if (!register) {
      throw new NotFoundError(
        "Cash register not found",
        undefined,
        "CashManagement:RegisterNotFound"
      );
    }

    const entries = await this.entryRepo.listEntriesForMonth(
      tenantId,
      workspaceId,
      register.id,
      input.month
    );
    const dayCloses = await this.dayCloseRepo.listDayClosesForMonth(
      tenantId,
      workspaceId,
      register.id,
      input.month
    );
    const attachments = await this.attachmentRepo.listAttachmentsForMonth(
      tenantId,
      workspaceId,
      register.id,
      input.month
    );
    const auditRows = await this.exportRepo.listAuditRowsForMonth(tenantId, input.month);

    const rendered = await this.exportPort.generate({
      register,
      entries,
      dayCloses,
      attachments,
      auditRows,
      month: input.month,
      format: input.format,
    });

    const artifact = await this.unitOfWork.withinTransaction(async (tx) => {
      const created = await this.exportRepo.createArtifact(
        {
          tenantId,
          workspaceId,
          registerId: register.id,
          month: input.month,
          format: input.format,
          fileName: rendered.fileName,
          contentType: rendered.contentType,
          contentBase64: rendered.data.toString("base64"),
          sizeBytes: rendered.data.byteLength,
          createdByUserId: ctx.userId ?? null,
          expiresAt: null,
        },
        tx
      );

      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "cash.export.generated",
          entityType: "CashExportArtifact",
          entityId: created.id,
          metadata: {
            registerId: register.id,
            month: input.month,
            format: input.format,
            sizeBytes: created.sizeBytes,
          },
        },
        tx
      );

      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "cash.export.generated",
          payload: {
            exportId: created.id,
            registerId: register.id,
            month: input.month,
            format: input.format,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      return created;
    });

    const response = {
      export: {
        fileToken: artifact.id,
        fileName: artifact.fileName,
        contentType: artifact.contentType,
        sizeBytes: artifact.sizeBytes,
        downloadUrl: `/cash-exports/${artifact.id}`,
      },
    };

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
