import type {
  IncomeSectionPayload,
  TaxReportSectionKey,
  UpsertTaxReportSectionOutput,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { Injectable } from "@nestjs/common";
import {
  TaxEricJobRepoPort,
  TaxReportRepoPort,
  TaxReportSectionRepoPort,
} from "../../domain/ports";
import { ensureIncomeTaxReportForFiling } from "./tax-reporting.helpers";
import {
  ANNUAL_INCOME_REPORT_TYPE,
  ANNUAL_INCOME_SECTION_KEY,
} from "../services/annual-income-report.service";
import {
  buildIncomeTaxReturnReportSummary,
  createTaxReportSectionPayloadEnvelope,
  INCOME_TAX_RETURN_SECTION_KEYS,
  toTaxReportSectionDto,
  validateTaxReportSectionPayload,
} from "../services/income-tax-return-section.service";
import type { TaxReportSectionValidationErrorEntity } from "../../domain/entities/tax-report-section.entity";

const toEntityValidationErrors = (
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
export class UpsertTaxReportSectionUseCase extends BaseUseCase<
  {
    filingId: string;
    reportId: string;
    sectionKey: TaxReportSectionKey;
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
    input: {
      filingId: string;
      reportId: string;
      sectionKey: TaxReportSectionKey;
      payload: unknown;
    },
    ctx: UseCaseContext
  ): Promise<Result<UpsertTaxReportSectionOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await ensureIncomeTaxReportForFiling({
      reportRepo: this.reportRepo,
      workspaceId,
      filingId: input.filingId,
      reportId: input.reportId,
    });

    const validated = validateTaxReportSectionPayload(input.sectionKey, input.payload);
    const validationErrors = toEntityValidationErrors(validated.validationErrors);

    await this.sectionRepo.upsert({
      tenantId: workspaceId,
      filingId: input.filingId,
      reportId: report.id,
      reportType: ANNUAL_INCOME_REPORT_TYPE,
      sectionKey: input.sectionKey,
      payload: createTaxReportSectionPayloadEnvelope(input.sectionKey, validated.payload),
      completion: validated.completion,
      isComplete: validated.isComplete,
      validationErrors,
    });

    if (input.sectionKey === "income") {
      const incomePayload = validated.payload as IncomeSectionPayload;
      const annualIncomeValidation = validateTaxReportSectionPayload(
        ANNUAL_INCOME_SECTION_KEY,
        incomePayload.annualIncome
      );

      await this.sectionRepo.upsert({
        tenantId: workspaceId,
        filingId: input.filingId,
        reportId: report.id,
        reportType: ANNUAL_INCOME_REPORT_TYPE,
        sectionKey: ANNUAL_INCOME_SECTION_KEY,
        payload: createTaxReportSectionPayloadEnvelope(
          ANNUAL_INCOME_SECTION_KEY,
          annualIncomeValidation.payload
        ),
        completion: annualIncomeValidation.completion,
        isComplete: annualIncomeValidation.isComplete,
        validationErrors: toEntityValidationErrors(annualIncomeValidation.validationErrors),
      });
    }

    const [storedSections, jobs] = await Promise.all([
      this.sectionRepo.listByReport({
        tenantId: workspaceId,
        reportId: report.id,
      }),
      this.ericJobRepo.listByReport({
        tenantId: workspaceId,
        reportId: report.id,
      }),
    ]);

    const sectionsByKey = Object.fromEntries(
      storedSections
        .filter((section) =>
          INCOME_TAX_RETURN_SECTION_KEYS.includes(
            section.sectionKey as (typeof INCOME_TAX_RETURN_SECTION_KEYS)[number]
          )
        )
        .map((section) => [section.sectionKey, section])
    ) as never;
    const savedSection = storedSections.find((section) => section.sectionKey === input.sectionKey)!;

    return ok({
      report: buildIncomeTaxReturnReportSummary({
        reportId: report.id,
        sectionsByKey,
        jobs,
        fallbackUpdatedAt: report.updatedAt,
      }),
      section: toTaxReportSectionDto({
        key: input.sectionKey,
        section: {
          ...savedSection,
          validationErrors,
          completion: validated.completion,
          isComplete: validated.isComplete,
        },
        payload: validated.payload,
        validationErrors: validated.validationErrors,
      }),
    });
  }
}
