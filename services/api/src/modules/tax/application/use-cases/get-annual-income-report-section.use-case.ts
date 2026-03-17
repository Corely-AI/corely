import { Injectable } from "@nestjs/common";
import type { GetTaxReportSectionOutput } from "@corely/contracts";
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
  buildDefaultAnnualIncomePayload,
  evaluateAnnualIncomeSectionCompletion,
  readAnnualIncomePayloadFromLegacyMeta,
  readAnnualIncomePayloadFromSection,
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
export class GetAnnualIncomeReportSectionUseCase extends BaseUseCase<
  { filingId: string; reportId: string },
  GetTaxReportSectionOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly sectionRepo: TaxReportSectionRepoPort,
    private readonly ericJobRepo: TaxEricJobRepoPort
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: { filingId: string; reportId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetTaxReportSectionOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await ensureIncomeTaxReportForFiling({
      reportRepo: this.reportRepo,
      workspaceId,
      filingId: input.filingId,
      reportId: input.reportId,
    });

    const [storedSection, jobs] = await Promise.all([
      this.sectionRepo.findByReportAndSection({
        tenantId: workspaceId,
        reportId: report.id,
        sectionKey: ANNUAL_INCOME_SECTION_KEY,
      }),
      this.ericJobRepo.listByReport({
        tenantId: workspaceId,
        reportId: report.id,
      }),
    ]);

    const validatedSectionPayload = readAnnualIncomePayloadFromSection(storedSection);
    const payloadFromLegacy = readAnnualIncomePayloadFromLegacyMeta(report.meta);
    const annualIncome = storedSection
      ? validatedSectionPayload.payload
      : (payloadFromLegacy.payload ?? buildDefaultAnnualIncomePayload());
    const rawValidationErrors = storedSection
      ? validatedSectionPayload.validationErrors
      : payloadFromLegacy.validationErrors;
    const validationErrors = toSectionValidationErrors(rawValidationErrors);
    const computedCompletion = evaluateAnnualIncomeSectionCompletion({
      payload: annualIncome,
      validationErrors,
    });

    const sectionEntity =
      storedSection ??
      ({
        id: `${report.id}:${ANNUAL_INCOME_SECTION_KEY}`,
        filingId: input.filingId,
        reportId: report.id,
        reportType: ANNUAL_INCOME_REPORT_TYPE,
        sectionKey: ANNUAL_INCOME_SECTION_KEY,
        completion: computedCompletion.completion,
        isComplete: computedCompletion.isComplete,
        validationErrors,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      } as const);

    const reportSummary = buildAnnualIncomeReportSummary({
      reportId: report.id,
      section: storedSection
        ? {
            ...storedSection,
            completion: computedCompletion.completion,
            isComplete: computedCompletion.isComplete,
            validationErrors,
          }
        : null,
      jobs,
      fallbackUpdatedAt: report.updatedAt,
    });

    return ok({
      report: reportSummary,
      section: toAnnualIncomeSectionDto({
        section: sectionEntity,
        annualIncome,
        validationErrors,
      }),
    });
  }
}
