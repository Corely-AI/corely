import type { GetTaxReportSectionOutput, TaxReportSectionKey } from "@corely/contracts";
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
import { ANNUAL_INCOME_SECTION_KEY } from "../services/annual-income-report.service";
import {
  buildIncomeTaxReturnReportSummary,
  INCOME_TAX_RETURN_SECTION_KEYS,
  readTaxReportSectionPayload,
  toTaxReportSectionDto,
  type IncomeTaxReturnSectionKey,
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
export class GetTaxReportSectionUseCase extends BaseUseCase<
  { filingId: string; reportId: string; sectionKey: TaxReportSectionKey },
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
    input: { filingId: string; reportId: string; sectionKey: TaxReportSectionKey },
    ctx: UseCaseContext
  ): Promise<Result<GetTaxReportSectionOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await ensureIncomeTaxReportForFiling({
      reportRepo: this.reportRepo,
      workspaceId,
      filingId: input.filingId,
      reportId: input.reportId,
    });

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
      storedSections.map((section) => [section.sectionKey, section])
    ) as Partial<Record<TaxReportSectionKey, (typeof storedSections)[number]>>;
    const storedSection = sectionsByKey[input.sectionKey] ?? null;
    const legacyAnnualIncomeSection = sectionsByKey[ANNUAL_INCOME_SECTION_KEY] ?? null;
    const resolvedSection = readTaxReportSectionPayload({
      key: input.sectionKey,
      section: storedSection,
      legacyAnnualIncomeSection,
      reportMeta: report.meta,
    });

    const sectionEntity =
      storedSection ??
      ({
        id: `${report.id}:${input.sectionKey}`,
        tenantId: workspaceId,
        filingId: input.filingId,
        reportId: report.id,
        reportType: "annual_income_report",
        sectionKey: input.sectionKey,
        payload: {},
        completion: resolvedSection.completion,
        isComplete: resolvedSection.isComplete,
        validationErrors: toEntityValidationErrors(resolvedSection.validationErrors),
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      } satisfies {
        id: string;
        tenantId: string;
        filingId: string;
        reportId: string;
        reportType: "annual_income_report";
        sectionKey: TaxReportSectionKey;
        payload: Record<string, unknown>;
        completion: number;
        isComplete: boolean;
        validationErrors: TaxReportSectionValidationErrorEntity[];
        createdAt: Date;
        updatedAt: Date;
      });

    const summarySections: Partial<
      Record<IncomeTaxReturnSectionKey, (typeof storedSections)[number]>
    > = {};
    for (const key of INCOME_TAX_RETURN_SECTION_KEYS) {
      const rawSection = sectionsByKey[key] ?? null;
      const resolved = readTaxReportSectionPayload({
        key,
        section: rawSection,
        legacyAnnualIncomeSection,
        reportMeta: report.meta,
      });

      summarySections[key] = rawSection
        ? {
            ...rawSection,
            completion: resolved.completion,
            isComplete: resolved.isComplete,
            validationErrors: toEntityValidationErrors(resolved.validationErrors),
          }
        : {
            id: `${report.id}:${key}`,
            tenantId: workspaceId,
            filingId: input.filingId,
            reportId: report.id,
            reportType: "annual_income_report",
            sectionKey: key,
            payload: {},
            completion: resolved.completion,
            isComplete: resolved.isComplete,
            validationErrors: toEntityValidationErrors(resolved.validationErrors),
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
          };
    }

    return ok({
      report: buildIncomeTaxReturnReportSummary({
        reportId: report.id,
        sectionsByKey: summarySections,
        jobs,
        fallbackUpdatedAt: report.updatedAt,
      }),
      section: toTaxReportSectionDto({
        key: input.sectionKey,
        section: {
          ...sectionEntity,
          completion: resolvedSection.completion,
          isComplete: resolvedSection.isComplete,
          validationErrors: toEntityValidationErrors(resolvedSection.validationErrors),
        },
        payload: resolvedSection.payload,
        validationErrors: resolvedSection.validationErrors,
      }),
    });
  }
}
