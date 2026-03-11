import { Injectable } from "@nestjs/common";
import { CreateTaxFilingInput, CreateTaxFilingOutput } from "@corely/contracts";
import { TaxReportRepoPort, TaxProfileRepoPort } from "../../domain/ports";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { ReportRegistry } from "../../domain/reporting/report-registry";
import { type ReportGenerationContext } from "../../domain/reporting/report-strategy.interface";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ConflictError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class CreateTaxFilingUseCase extends BaseUseCase<
  CreateTaxFilingInput,
  CreateTaxFilingOutput
> {
  constructor(
    private readonly taxReportRepo: TaxReportRepoPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly periodResolver: VatPeriodResolver,
    private readonly reportRegistry: ReportRegistry
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: CreateTaxFilingInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateTaxFilingOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;

    // 1. Validate Input
    if (input.type === "vat" && !input.periodKey) {
      return err(new ValidationError("Period key is required for VAT filings"));
    }
    if (input.type !== "vat" && !input.year) {
      return err(new ValidationError("Year is required for annual filings"));
    }

    // 2. Resolve Dates
    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;
    let mapType = "VAT_ADVANCE"; // Default for VAT

    if (input.type === "vat" && input.periodKey) {
      const period = this.periodResolver.resolvePeriodKey(input.periodKey);
      periodStart = period.start;
      periodEnd = period.end;
      const yearLabel = String(periodStart.getUTCFullYear());
      periodLabel = period.label.includes(yearLabel)
        ? period.label
        : `${period.label} ${yearLabel}`;
    } else {
      // Annual types
      const year = input.year!;
      periodStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      periodLabel = year.toString();

      if (input.type === "income-annual") {
        mapType = "INCOME_TAX";
      } else if (input.type === "vat-annual") {
        mapType = "VAT_ANNUAL";
      } else if (input.type === "trade") {
        mapType = "TRADE_TAX";
      }
      // ... map other types
    }

    // 3. Check for duplicates
    // Using existing list logic style or dedicated check
    // Ideally repo has exists method, using list for now
    const duplicateSearchEnd =
      mapType === "VAT_ADVANCE"
        ? periodEnd
        : new Date(Date.UTC(periodStart.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));

    const existing = await this.taxReportRepo.listByPeriodRange(
      workspaceId,
      mapType,
      periodStart,
      duplicateSearchEnd
    );
    const duplicate = existing.find(
      (report) =>
        report.periodStart.getTime() === periodStart.getTime() &&
        (mapType !== "VAT_ADVANCE" || report.periodEnd.getTime() === periodEnd.getTime())
    );
    if (duplicate) {
      return err(
        new ConflictError("Filing already exists for this period", {
          filingId: duplicate.id,
          periodKey: input.periodKey,
        })
      );
    }

    // 4. Create (Upsert)
    // We use upsertByPeriod which is the standard way to create/update reports in this domain
    const dueDate =
      mapType === "VAT_ADVANCE"
        ? this.resolveVatAdvanceDueDate(periodEnd)
        : await this.resolveAnnualDueDate({
            workspaceId,
            type: mapType,
            periodStart,
            periodEnd,
          });

    const group =
      mapType === "VAT_ADVANCE"
        ? "ADVANCE_VAT"
        : mapType === "VAT_ANNUAL" || mapType === "INCOME_TAX" || mapType === "TRADE_TAX"
          ? "ANNUAL_REPORT"
          : "COMPLIANCE";

    const newReport = await this.taxReportRepo.upsertByPeriod({
      tenantId: workspaceId,
      type: mapType,
      group,
      periodLabel,
      periodStart,
      periodEnd,
      dueDate,
      status: "OPEN",
      // optional fields
      amountFinalCents: null,
      submissionReference: null,
      submissionNotes: input.metadata ? JSON.stringify(input.metadata) : null,
    });

    return ok({
      id: newReport.id,
    });
  }

  private resolveVatAdvanceDueDate(periodEnd: Date) {
    return new Date(
      Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + 1, 10, 23, 59, 59, 999)
    );
  }

  private async resolveAnnualDueDate(params: {
    workspaceId: string;
    type: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    const fallback = new Date(
      Date.UTC(params.periodEnd.getUTCFullYear() + 1, 6, 31, 23, 59, 59, 999)
    );
    const profile = await this.taxProfileRepo.getActive(params.workspaceId, params.periodEnd);
    if (!profile) {
      return fallback;
    }

    try {
      const strategy = this.reportRegistry.getStrategy(params.type as any, profile.country);
      const ctx: ReportGenerationContext = {
        tenantId: params.workspaceId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        profile: {
          ...profile,
          country: profile.country as "DE",
          vatAccountingMethod: profile.vatAccountingMethod ?? "IST",
          effectiveFrom: profile.effectiveFrom.toISOString(),
          effectiveTo: profile.effectiveTo?.toISOString() ?? null,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
      };
      return strategy.getDueDate(params.periodEnd, ctx);
    } catch {
      return fallback;
    }
  }
}
