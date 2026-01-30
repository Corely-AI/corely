import { Injectable } from "@nestjs/common";
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
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";

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
    private readonly detailUseCase: GetTaxFilingDetailUseCase
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
      return err(new NotFoundError("Filing not found"));
    }

    if (["SUBMITTED", "PAID", "ARCHIVED"].includes(report.status)) {
      return err(new ConflictError("Filing already submitted"));
    }

    const currentIssues = Array.isArray(report.meta?.issues) ? report.meta?.issues : [];
    const hasBlockers = currentIssues.some(
      (issue) => typeof issue === "object" && issue && (issue as any).severity === "blocker"
    );
    if (hasBlockers) {
      return err(new ConflictError("Submission blocked by unresolved issues"));
    }

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

    const refreshed = await this.detailUseCase.execute(input.filingId, ctx);
    if ("error" in refreshed) {
      return refreshed;
    }
    return ok({ filing: refreshed.value.filing });
  }
}
