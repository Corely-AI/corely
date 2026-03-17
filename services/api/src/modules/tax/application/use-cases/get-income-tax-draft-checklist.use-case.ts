import { Injectable } from "@nestjs/common";
import { type GetIncomeTaxDraftChecklistOutput } from "@corely/contracts";
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
  buildIncomeTaxDraftNextRequiredActions,
  readIncomeTaxDraftState,
} from "./income-tax-draft.utils";

@RequireTenant()
@Injectable()
export class GetIncomeTaxDraftChecklistUseCase extends BaseUseCase<
  string,
  GetIncomeTaxDraftChecklistOutput
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
  ): Promise<Result<GetIncomeTaxDraftChecklistOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId || "";
    const report = await getIncomeTaxDraftReportById({
      reportRepo: this.reportRepo,
      workspaceId,
      draftId,
    });

    await this.support.assertSupported({
      workspaceId,
      year: report.periodStart.getUTCFullYear(),
    });

    const state = readIncomeTaxDraftState(report.meta);
    const checklist = state.checklist ?? buildIncomeTaxDraftChecklist(state);

    return ok({
      draftId: report.id,
      checklist,
      nextRequiredActions: buildIncomeTaxDraftNextRequiredActions(state, checklist),
    });
  }
}
