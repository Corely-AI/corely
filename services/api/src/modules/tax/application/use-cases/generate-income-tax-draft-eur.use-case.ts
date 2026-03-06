import { Inject, Injectable } from "@nestjs/common";
import { type GenerateIncomeTaxDraftEurOutput } from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { type TaxEurSourcePort, TAX_EUR_SOURCE_PORT } from "../ports/tax-eur-source.port";
import { IncomeTaxDraftSupportService } from "../services/income-tax-draft-support.service";
import { getIncomeTaxDraftReportById } from "./income-tax-draft-report.helpers";
import {
  buildIncomeTaxDraftChecklist,
  buildIncomeTaxDraftDto,
  buildIncomeTaxDraftMutationOutput,
  readIncomeTaxDraftState,
  writeIncomeTaxDraftState,
} from "./income-tax-draft.utils";

@RequireTenant()
@Injectable()
export class GenerateIncomeTaxDraftEurUseCase extends BaseUseCase<
  string,
  GenerateIncomeTaxDraftEurOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly support: IncomeTaxDraftSupportService,
    @Inject(TAX_EUR_SOURCE_PORT) private readonly eurSource: TaxEurSourcePort
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    draftId: string,
    ctx: UseCaseContext
  ): Promise<Result<GenerateIncomeTaxDraftEurOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId || "";
    const report = await getIncomeTaxDraftReportById({
      reportRepo: this.reportRepo,
      workspaceId,
      draftId,
    });

    const year = report.periodStart.getUTCFullYear();
    const support = await this.support.assertSupported({ workspaceId, year });

    const totals = await this.eurSource.getEurTotals({
      workspaceId,
      year,
      basis: "cash",
    });

    const state = readIncomeTaxDraftState(report.meta);
    state.eurStatement = support.pack.buildEurStatement({
      year,
      currency: totals.currency,
      basis: "cash",
      incomeByCategory: totals.incomeByCategory,
      expenseByCategory: totals.expenseByCategory,
      generatedAt: new Date(),
    });
    state.computed = null;
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
