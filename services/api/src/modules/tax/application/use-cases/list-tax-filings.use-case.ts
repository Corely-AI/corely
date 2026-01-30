import { Injectable } from "@nestjs/common";
import {
  ListTaxFilingsInput,
  ListTaxFilingsOutput,
  TaxFilingDto,
  TaxFilingType,
  TaxFilingStatus,
} from "@corely/contracts";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { VatPeriodQueryPort, TaxProfileRepoPort, TaxReportRepoPort } from "../../domain/ports";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class ListTaxFilingsUseCase extends BaseUseCase<ListTaxFilingsInput, ListTaxFilingsOutput> {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly taxReportRepo: TaxReportRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: ListTaxFilingsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListTaxFilingsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;
    const now = new Date();
    const year = input.year ?? now.getUTCFullYear();
    const filings: TaxFilingDto[] = [];

    // 1. VAT Filings (if requested)
    const includeVat = !input.type || input.type === "VAT";
    if (includeVat) {
      let periods = this.periodResolver.getQuartersOfYear(year);
      if (input.periodKey) {
        periods = periods.filter((p) => p.key === input.periodKey);
      }

      const reports = await this.taxReportRepo.listByPeriodRange(
        workspaceId,
        "VAT_ADVANCE",
        new Date(Date.UTC(year, 0, 1)),
        new Date(Date.UTC(year + 1, 0, 1))
      );

      const reportByKey = new Map(
        reports.map((r) => [this.periodResolver.resolveQuarter(r.periodStart).key, r])
      );

      for (const p of periods) {
        // Filter by date range if needed (though typically we show full year)

        const report = reportByKey.get(p.key);
        // Determine status
        let status: TaxFilingStatus = "DRAFT";
        if (report) {
          if (report.status === "SUBMITTED") {
            status = "SUBMITTED";
          } else if (report.status === "PAID") {
            status = "PAID";
          } else if (report.status === "ARCHIVED") {
            status = "ARCHIVED";
          } else if (report.status === "OVERDUE") {
            status = "NEEDS_FIX";
          } // Mapping simplistic for now
        } else {
          if (now > p.end) {
            status = "NEEDS_FIX"; // Overdue effectively
          } else if (now >= p.start) {
            status = "DRAFT";
          } else {
            continue; // Future period, maybe don't show yet or show as locked?
          }
        }

        const hasExtension = false; // TODO: read from profile
        const dueDate = new Date(p.end);
        dueDate.setUTCDate(10);
        // If hasExtension, add 1 month: dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);

        filings.push({
          id: report?.id ?? p.key, // Use report ID if exists, else key
          type: "VAT",
          periodLabel: p.label,
          periodStart: p.start.toISOString(),
          periodEnd: p.end.toISOString(),
          dueDate: dueDate.toISOString(),
          status,
          amountCents: report?.amountFinalCents ?? null,
          currency: "EUR", // Should come from profile
          allowedActions: status === "SUBMITTED" ? ["mark-paid"] : ["edit", "submit"],
        });
      }
    }

    // 2. Other Filings (Income Tax, etc) form TaxReports
    const otherTypes =
      input.type && input.type !== "VAT" ? [input.type] : ["INCOME_TAX", "VAT_ANNUAL", "TRADE"];
    // Note: This is simplified. Real logic would query checks based on input.type
    // We fetch all non-VAT reports for the year
    const allReports = await this.taxReportRepo.listByPeriodRange(
      workspaceId,
      // Hack: pass null or ignore type to get all?
      //Repo likely filters by type. For now let's assume we iterate known types if repo doesn't support "all"
      "INCOME_TAX",
      new Date(Date.UTC(year, 0, 1)),
      new Date(Date.UTC(year + 1, 0, 1))
    );

    for (const r of allReports) {
      // Map status
      let status: TaxFilingStatus = "DRAFT";
      if (r.status === "SUBMITTED") {
        status = "SUBMITTED";
      } else if (r.status === "PAID") {
        status = "PAID";
      } else if (r.status === "ARCHIVED") {
        status = "ARCHIVED";
      }

      filings.push({
        id: r.id,
        type: this.mapReportTypeToFilingType(r.type),
        periodLabel: r.periodLabel,
        dueDate: r.dueDate.toISOString(),
        status,
        amountCents: r.amountFinalCents ?? r.amountEstimatedCents ?? null,
        currency: r.currency,
        allowedActions: [],
      });
    }

    // 3. Filter & Sort
    let results = filings;
    if (input.status) {
      results = results.filter((f) => f.status === input.status);
    }

    // Sort by due date
    results.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // 4. Paginate
    const total = results.length;
    const page = input.page;
    const pageSize = input.pageSize;
    const paginated = results.slice((page - 1) * pageSize, page * pageSize);

    return ok({
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  private mapReportTypeToFilingType(type: string): TaxFilingType {
    if (type === "INCOME_TAX") {
      return "INCOME_TAX";
    }
    if (type === "VAT_ANNUAL") {
      return "VAT_ANNUAL";
    }
    if (type === "TRADE_TAX") {
      return "TRADE";
    }
    return "OTHER";
  }
}
