import type { ListTaxReportSectionsOutput, TaxReportSectionKey } from "@corely/contracts";
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
export class ListTaxReportSectionsUseCase extends BaseUseCase<
  { filingId: string; reportId: string },
  ListTaxReportSectionsOutput
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
  ): Promise<Result<ListTaxReportSectionsOutput, UseCaseError>> {
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
    const legacyAnnualIncomeSection = sectionsByKey[ANNUAL_INCOME_SECTION_KEY] ?? null;

    const resolvedSections = INCOME_TAX_RETURN_SECTION_KEYS.map((key) => {
      const storedSection = sectionsByKey[key] ?? null;
      const resolved = readTaxReportSectionPayload({
        key,
        section: storedSection,
        legacyAnnualIncomeSection,
        reportMeta: report.meta,
      });

      const sectionEntity =
        storedSection ??
        ({
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

      return {
        dto: toTaxReportSectionDto({
          key,
          section: {
            ...sectionEntity,
            completion: resolved.completion,
            isComplete: resolved.isComplete,
            validationErrors: toEntityValidationErrors(resolved.validationErrors),
          },
          payload: resolved.payload,
          validationErrors: resolved.validationErrors,
        }),
        entity: {
          ...sectionEntity,
          completion: resolved.completion,
          isComplete: resolved.isComplete,
          validationErrors: toEntityValidationErrors(resolved.validationErrors),
        },
      };
    });

    return ok({
      report: buildIncomeTaxReturnReportSummary({
        reportId: report.id,
        sectionsByKey: Object.fromEntries(
          resolvedSections.map((item) => [item.entity.sectionKey, item.entity])
        ) as never,
        jobs,
        fallbackUpdatedAt: report.updatedAt,
      }),
      sections: resolvedSections.map((item) => item.dto),
    });
  }
}
