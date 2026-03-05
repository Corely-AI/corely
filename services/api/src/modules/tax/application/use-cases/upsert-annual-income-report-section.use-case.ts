import { Injectable } from "@nestjs/common";
import type { UpsertTaxReportSectionOutput } from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import {
  TaxEricJobRepoPort,
  TaxReportRepoPort,
  TaxReportSectionRepoPort,
} from "../../domain/ports";
import {
  ANNUAL_INCOME_REPORT_TYPE,
  ANNUAL_INCOME_SECTION_KEY,
  buildAnnualIncomeReportSummary,
  evaluateAnnualIncomeSectionCompletion,
  validateAnnualIncomeSectionPayload,
} from "../services/annual-income-report.service";
import { ensureIncomeTaxReportForFiling, toAnnualIncomeSectionDto } from "./tax-reporting.helpers";
import type { TaxReportSectionValidationErrorEntity } from "../../domain/entities/tax-report-section.entity";

const toSectionValidationErrors = (
  errors: { path?: string; message?: string; code?: string }[]
): TaxReportSectionValidationErrorEntity[] =>
  errors
    .filter(
      (error): error is { path: string; message: string; code?: string } =>
        typeof error.path === "string" && typeof error.message === "string"
    )
    .map((error) => ({
      path: error.path,
      message: error.message,
      code: error.code,
    }));

@RequireTenant()
@Injectable()
export class UpsertAnnualIncomeReportSectionUseCase extends BaseUseCase<
  {
    filingId: string;
    reportId: string;
    payload: unknown;
  },
  UpsertTaxReportSectionOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly sectionRepo: TaxReportSectionRepoPort,
    private readonly ericJobRepo: TaxEricJobRepoPort
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: { filingId: string; reportId: string; payload: unknown },
    ctx: UseCaseContext
  ): Promise<Result<UpsertTaxReportSectionOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await ensureIncomeTaxReportForFiling({
      reportRepo: this.reportRepo,
      workspaceId,
      filingId: input.filingId,
      reportId: input.reportId,
    });

    const validated = validateAnnualIncomeSectionPayload(input.payload);
    const validationErrors = toSectionValidationErrors(validated.validationErrors);
    const completion = evaluateAnnualIncomeSectionCompletion({
      payload: validated.payload,
      validationErrors,
    });

    const [section, jobs] = await Promise.all([
      this.sectionRepo.upsert({
        tenantId: workspaceId,
        filingId: input.filingId,
        reportId: report.id,
        reportType: ANNUAL_INCOME_REPORT_TYPE,
        sectionKey: ANNUAL_INCOME_SECTION_KEY,
        payload: {
          annualIncome: validated.payload,
        },
        completion: completion.completion,
        isComplete: completion.isComplete,
        validationErrors,
      }),
      this.ericJobRepo.listByReport({
        tenantId: workspaceId,
        reportId: report.id,
      }),
    ]);

    const reportSummary = buildAnnualIncomeReportSummary({
      reportId: report.id,
      section: {
        ...section,
        validationErrors,
      },
      jobs,
      fallbackUpdatedAt: report.updatedAt,
    });

    return ok({
      report: reportSummary,
      section: toAnnualIncomeSectionDto({
        section: {
          ...section,
          validationErrors,
        },
        annualIncome: validated.payload,
        validationErrors,
      }),
    });
  }
}
