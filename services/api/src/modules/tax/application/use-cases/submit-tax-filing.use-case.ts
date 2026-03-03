import { Injectable, Inject } from "@nestjs/common";
import { type SubmitTaxFilingRequest, type SubmitTaxFilingResponse } from "@corely/contracts";
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
import {
  TaxFilingStatus,
  assertFilingTransition,
  dbStatusToFilingStatus,
} from "../../domain/entities/tax-filing-status";

export type SubmitTaxFilingInput = {
  filingId: string;
  request: SubmitTaxFilingRequest;
};

@RequireTenant()
@Injectable()
export class SubmitTaxFilingUseCase extends BaseUseCase<
  SubmitTaxFilingInput,
  SubmitTaxFilingResponse
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly detailUseCase: GetTaxFilingDetailUseCase,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: SubmitTaxFilingInput,
    ctx: UseCaseContext
  ): Promise<Result<SubmitTaxFilingResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, input.filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found", { code: "Tax:FilingNotFound" }));
    }

    // Domain guard: validate transition using state machine
    // assertFilingTransition throws TaxFilingInvalidTransitionError (AppError)
    // which propagates through the ProblemDetails filter automatically.
    const currentStatus = dbStatusToFilingStatus(report.status);
    assertFilingTransition(currentStatus, TaxFilingStatus.SUBMITTED, input.filingId);

    // Check for unresolved blockers in filing issues
    const currentIssues = Array.isArray(report.meta?.issues) ? report.meta?.issues : [];
    const hasBlockers = currentIssues.some(
      (issue) =>
        typeof issue === "object" &&
        issue !== null &&
        (issue as { severity?: string }).severity === "blocker"
    );
    if (hasBlockers) {
      return err(new ConflictError("Submission blocked by unresolved issues"));
    }

    // Persist the submission
    await this.reportRepo.submitReport({
      tenantId: workspaceId,
      reportId: input.filingId,
      submittedAt: new Date(input.request.submittedAt),
      submissionReference: input.request.submissionId,
      submissionNotes: input.request.notes ?? null,
    });

    const nextMeta = {
      ...(report.meta ?? {}),
      submission: {
        method: input.request.method,
        submissionId: input.request.submissionId,
        submittedAt: input.request.submittedAt,
      },
    };
    await this.reportRepo.updateMeta({
      tenantId: workspaceId,
      reportId: input.filingId,
      meta: nextMeta,
    });

    // Emit domain event via outbox (fire-and-forget, non-transactional for now)
    await this.outbox.enqueue({
      eventType: "TaxFilingSubmitted",
      payload: {
        filingId: input.filingId,
        tenantId: workspaceId,
        submittedAt: input.request.submittedAt,
        submissionId: input.request.submissionId,
        method: input.request.method,
      },
      tenantId: workspaceId,
    });

    // Write audit trail
    await this.audit.log({
      tenantId: workspaceId,
      action: "tax_filing.submitted",
      entityType: "TAX_FILING",
      entityId: input.filingId,
      userId: ctx.userId ?? "system",
      metadata: {
        submissionId: input.request.submissionId,
        method: input.request.method,
      },
    });

    const refreshed = await this.detailUseCase.execute(input.filingId, ctx);
    if ("error" in refreshed) {
      return refreshed;
    }
    return ok({ filing: refreshed.value.filing });
  }
}
