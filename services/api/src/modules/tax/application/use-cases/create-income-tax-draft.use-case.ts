import { Injectable } from "@nestjs/common";
import { type CreateIncomeTaxDraftInput, type CreateIncomeTaxDraftOutput } from "@corely/contracts";
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
import { ensureIncomeTaxDraftReport } from "./income-tax-draft-report.helpers";
import {
  buildIncomeTaxDraftChecklist,
  buildIncomeTaxDraftDto,
  buildIncomeTaxDraftNextRequiredActions,
  buildIncomeTaxDraftSummary,
  readIncomeTaxDraftState,
  writeIncomeTaxDraftState,
} from "./income-tax-draft.utils";

@RequireTenant()
@Injectable()
export class CreateIncomeTaxDraftUseCase extends BaseUseCase<
  CreateIncomeTaxDraftInput,
  CreateIncomeTaxDraftOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly support: IncomeTaxDraftSupportService
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: CreateIncomeTaxDraftInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateIncomeTaxDraftOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId || "";

    await this.support.assertSupported({
      workspaceId,
      year: input.year,
    });

    const report = await ensureIncomeTaxDraftReport({
      reportRepo: this.reportRepo,
      workspaceId,
      year: input.year,
    });

    const state = readIncomeTaxDraftState(report.meta);
    state.checklist = buildIncomeTaxDraftChecklist(state);

    const updatedReport = await this.reportRepo.updateMeta({
      tenantId: workspaceId,
      reportId: report.id,
      meta: writeIncomeTaxDraftState(report.meta, state),
    });

    const draft = buildIncomeTaxDraftDto({
      draftId: updatedReport.id,
      year: updatedReport.periodStart.getUTCFullYear(),
      currency: updatedReport.currency,
      createdAtIso: updatedReport.createdAt.toISOString(),
      updatedAtIso: updatedReport.updatedAt.toISOString(),
      state,
    });

    return ok({
      draftId: draft.draftId,
      year: draft.year,
      status: draft.status,
      draftSummary: buildIncomeTaxDraftSummary(draft),
      nextRequiredActions: buildIncomeTaxDraftNextRequiredActions(state, draft.checklist),
    });
  }
}
