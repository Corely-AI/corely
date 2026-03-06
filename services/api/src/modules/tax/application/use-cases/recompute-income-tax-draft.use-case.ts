import { Injectable } from "@nestjs/common";
import { type RecomputeIncomeTaxDraftOutput } from "@corely/contracts";
import {
  BaseUseCase,
  ValidationError,
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
  buildIncomeTaxDraftComputed,
  buildIncomeTaxDraftDto,
  buildIncomeTaxDraftMutationOutput,
  readIncomeTaxDraftState,
  writeIncomeTaxDraftState,
} from "./income-tax-draft.utils";

@RequireTenant()
@Injectable()
export class RecomputeIncomeTaxDraftUseCase extends BaseUseCase<
  string,
  RecomputeIncomeTaxDraftOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly support: IncomeTaxDraftSupportService
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    draftId: string,
    ctx: UseCaseContext
  ): Promise<Result<RecomputeIncomeTaxDraftOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId || "";
    const report = await getIncomeTaxDraftReportById({
      reportRepo: this.reportRepo,
      workspaceId,
      draftId,
    });

    const year = report.periodStart.getUTCFullYear();
    await this.support.assertSupported({ workspaceId, year });

    const state = readIncomeTaxDraftState(report.meta);
    if (!state.eurStatement) {
      throw new ValidationError(
        "Generate EÜR before recomputing the annual income tax draft.",
        undefined,
        "Tax:EurMissing"
      );
    }

    state.computed = buildIncomeTaxDraftComputed(state, new Date().toISOString());
    state.checklist = buildIncomeTaxDraftChecklist(state);

    const updatedReport = await this.reportRepo.updateMeta({
      tenantId: workspaceId,
      reportId: report.id,
      meta: writeIncomeTaxDraftState(report.meta, state),
    });

    const draft = buildIncomeTaxDraftDto({
      draftId: updatedReport.id,
      year,
      currency: updatedReport.currency,
      createdAtIso: updatedReport.createdAt.toISOString(),
      updatedAtIso: updatedReport.updatedAt.toISOString(),
      state,
    });

    return ok(buildIncomeTaxDraftMutationOutput(draft));
  }
}
