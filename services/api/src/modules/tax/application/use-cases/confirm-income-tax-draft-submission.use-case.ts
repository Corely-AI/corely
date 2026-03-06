import { Injectable } from "@nestjs/common";
import {
  type ConfirmIncomeTaxDraftSubmissionInput,
  type ConfirmIncomeTaxDraftSubmissionOutput,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { IncomeTaxDraftSupportService } from "../services/income-tax-draft-support.service";
import { getIncomeTaxDraftReportById } from "./income-tax-draft-report.helpers";
import {
  buildIncomeTaxDraftChecklist,
  buildIncomeTaxDraftDto,
  buildIncomeTaxDraftMutationOutput,
  readIncomeTaxDraftState,
  toIncomeTaxSubmission,
  writeIncomeTaxDraftState,
} from "./income-tax-draft.utils";

export type ConfirmIncomeTaxDraftSubmissionUseCaseInput = {
  draftId: string;
  request: ConfirmIncomeTaxDraftSubmissionInput;
};

@RequireTenant()
@Injectable()
export class ConfirmIncomeTaxDraftSubmissionUseCase extends BaseUseCase<
  ConfirmIncomeTaxDraftSubmissionUseCaseInput,
  ConfirmIncomeTaxDraftSubmissionOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly support: IncomeTaxDraftSupportService
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: ConfirmIncomeTaxDraftSubmissionUseCaseInput,
    ctx: UseCaseContext
  ): Promise<Result<ConfirmIncomeTaxDraftSubmissionOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId || "";
    const report = await getIncomeTaxDraftReportById({
      reportRepo: this.reportRepo,
      workspaceId,
      draftId: input.draftId,
    });

    const year = report.periodStart.getUTCFullYear();
    await this.support.assertSupported({ workspaceId, year });

    const submittedAtIso = input.request.submittedAt ?? new Date().toISOString();
    const state = readIncomeTaxDraftState(report.meta);
    state.submission = toIncomeTaxSubmission({
      channel: input.request.channel,
      submittedAtIso,
      referenceId: input.request.referenceId,
      notes: input.request.notes,
    });
    state.checklist = buildIncomeTaxDraftChecklist(state);

    await this.reportRepo.updateMeta({
      tenantId: workspaceId,
      reportId: report.id,
      meta: writeIncomeTaxDraftState(report.meta, state),
    });

    const submittedReport = await this.reportRepo.submitReport({
      tenantId: workspaceId,
      reportId: report.id,
      submittedAt: new Date(submittedAtIso),
      submissionReference: input.request.referenceId ?? "MANUAL-SUBMISSION",
      submissionNotes: input.request.notes ?? null,
    });

    const draft = buildIncomeTaxDraftDto({
      draftId: submittedReport.id,
      year,
      currency: submittedReport.currency,
      createdAtIso: submittedReport.createdAt.toISOString(),
      updatedAtIso: submittedReport.updatedAt.toISOString(),
      state,
    });

    return ok(buildIncomeTaxDraftMutationOutput(draft));
  }
}
