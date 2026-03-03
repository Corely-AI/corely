import { Injectable, Inject } from "@nestjs/common";
import {
  type MarkTaxFilingPaidRequest,
  type MarkTaxFilingPaidResponse,
  type DocumentLinkEntityType,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
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
import {
  TaxFilingStatus,
  assertFilingTransition,
  dbStatusToFilingStatus,
} from "../../domain/entities/tax-filing-status";

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
    assertFilingTransition(currentStatus, TaxFilingStatus.PAID, input.filingId);

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
}
