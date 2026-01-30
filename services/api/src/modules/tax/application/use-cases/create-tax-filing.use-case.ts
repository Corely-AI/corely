import { Injectable } from "@nestjs/common";
import { CreateTaxFilingInput, CreateTaxFilingOutput } from "@corely/contracts";
import { TaxReportRepoPort, TaxProfileRepoPort } from "../../domain/ports";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
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
    private readonly periodResolver: VatPeriodResolver
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
      periodStart = new Date(Date.UTC(year, 0, 1));
      periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
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
    const existing = await this.taxReportRepo.listByPeriodRange(
      workspaceId,
      mapType,
      periodStart,
      periodEnd // This range check might be loose, but acceptable for MVP
    );
    const duplicate = existing.find(
      (report) =>
        report.periodStart.getTime() === periodStart.getTime() &&
        report.periodEnd.getTime() === periodEnd.getTime()
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
    const dueDate = new Date(periodEnd);
    dueDate.setUTCDate(10); // Simple default rule, should ideally use strategy

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
}
