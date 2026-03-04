import { Injectable } from "@nestjs/common";
import { type GetIncomeTaxDraftOutput } from "@corely/contracts";
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
  readIncomeTaxDraftState,
} from "./income-tax-draft.utils";

@RequireTenant()
@Injectable()
export class GetIncomeTaxDraftUseCase extends BaseUseCase<string, GetIncomeTaxDraftOutput> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly support: IncomeTaxDraftSupportService
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    draftId: string,
    ctx: UseCaseContext
  ): Promise<Result<GetIncomeTaxDraftOutput, UseCaseError>> {
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
    state.checklist = state.checklist ?? buildIncomeTaxDraftChecklist(state);

    const draft = buildIncomeTaxDraftDto({
      draftId: report.id,
      year: report.periodStart.getUTCFullYear(),
      currency: report.currency,
      createdAtIso: report.createdAt.toISOString(),
      updatedAtIso: report.updatedAt.toISOString(),
      state,
    });

    return ok({ draft });
  }
}
