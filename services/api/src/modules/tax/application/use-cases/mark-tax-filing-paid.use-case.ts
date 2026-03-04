import { Injectable, Inject } from "@nestjs/common";
import {
  type MarkTaxFilingPaidRequest,
  type MarkTaxFilingPaidResponse,
  type DocumentLinkEntityType,
  type TaxFilingActivityEvent,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ConflictError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
  OUTBOX_PORT,
  AUDIT_PORT,
  type OutboxPort,
  type AuditPort,
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";
import { DocumentsApplication } from "../../../documents/application/documents.application";
import { TaxFilingStatus, dbStatusToFilingStatus } from "../../domain/entities/tax-filing-status";

export type MarkTaxFilingPaidInput = {
  filingId: string;
  request: MarkTaxFilingPaidRequest;
};

@RequireTenant()
@Injectable()
export class MarkTaxFilingPaidUseCase extends BaseUseCase<
  MarkTaxFilingPaidInput,
  MarkTaxFilingPaidResponse
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly detailUseCase: GetTaxFilingDetailUseCase,
    private readonly documentsApp: DocumentsApplication,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: MarkTaxFilingPaidInput,
    ctx: UseCaseContext
  ): Promise<Result<MarkTaxFilingPaidResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, input.filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found", { code: "Tax:FilingNotFound" }));
    }

    // Domain guard: validate SUBMITTED → PAID transition
    const currentStatus = dbStatusToFilingStatus(report.status);
    if (currentStatus !== TaxFilingStatus.SUBMITTED) {
      return err(new ConflictError("Filing must be submitted before marking as paid"));
    }

    // Optionally link proof document via Documents module
    if (input.request.proofDocumentId) {
      const linkResult = await this.documentsApp.linkDocument.execute(
        {
          documentId: input.request.proofDocumentId,
          entityType: "OTHER" as DocumentLinkEntityType,
          entityId: input.filingId,
        },
        ctx
      );
      if ("error" in linkResult) {
        return linkResult;
      }
    }

    await this.reportRepo.markPaid({
      tenantId: workspaceId,
      reportId: input.filingId,
      paidAt: new Date(input.request.paidAt),
      amountCents: input.request.amountCents,
      method: input.request.method,
      proofDocumentId: input.request.proofDocumentId ?? null,
    });

    await this.reportRepo.updateMeta({
      tenantId: workspaceId,
      reportId: input.filingId,
      meta: {
        ...(report.meta ?? {}),
        payment: {
          paidAt: input.request.paidAt,
          method: input.request.method,
          amountCents: input.request.amountCents,
          proofDocumentId: input.request.proofDocumentId ?? null,
        },
        activity: this.appendActivity(report.meta, {
          id: `${input.filingId}-paid-${Date.now()}`,
          type: "paid",
          timestamp: input.request.paidAt,
          actor: ctx.userId ? { id: ctx.userId } : undefined,
          payload: {
            amountCents: input.request.amountCents,
            method: input.request.method,
          },
        }),
      },
    });

    // Emit domain event
    await this.outbox.enqueue({
      eventType: "TaxFilingPaid",
      payload: {
        filingId: input.filingId,
        tenantId: workspaceId,
        paidAt: input.request.paidAt,
        amountCents: input.request.amountCents,
        method: input.request.method,
        proofDocumentId: input.request.proofDocumentId ?? null,
      },
      tenantId: workspaceId,
    });

    // Write audit trail
    await this.audit.log({
      tenantId: workspaceId,
      action: "tax_filing.paid",
      entityType: "TAX_FILING",
      entityId: input.filingId,
      userId: ctx.userId ?? "system",
      metadata: {
        amountCents: input.request.amountCents,
        method: input.request.method,
        paidAt: input.request.paidAt,
      },
    });

    const refreshed = await this.detailUseCase.execute(input.filingId, ctx);
    if ("error" in refreshed) {
      return refreshed;
    }
    return ok({ filing: refreshed.value.filing });
  }

  private appendActivity(
    meta: Record<string, unknown> | null | undefined,
    event: TaxFilingActivityEvent
  ): TaxFilingActivityEvent[] {
    const current =
      meta && typeof meta === "object" && Array.isArray(meta.activity) ? meta.activity : [];
    const typed = current
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        return item as TaxFilingActivityEvent;
      })
      .filter((item): item is TaxFilingActivityEvent => Boolean(item));
    return [...typed, event];
  }
}
