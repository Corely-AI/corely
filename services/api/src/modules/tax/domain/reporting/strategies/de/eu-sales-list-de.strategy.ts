import { Injectable } from "@nestjs/common";
import {
  ReportStrategy,
  ReportGenerationContext,
  ReportGenerationResult,
} from "../../report-strategy.interface";
import { VatPeriodQueryPort } from "../../../ports/vat-period-query.port";

@Injectable()
export class EuSalesListDeStrategy implements ReportStrategy {
  readonly type = "EU_SALES_LIST";
  readonly countryCode = "DE";

  constructor(private readonly vatQuery: VatPeriodQueryPort) {}

  async isRequired(ctx: ReportGenerationContext): Promise<boolean> {
    // Required if enabled in profile
    return !!ctx.profile.euB2BSales;
  }

  async generate(ctx: ReportGenerationContext): Promise<ReportGenerationResult> {
    const details = await this.vatQuery.getDetails(
      ctx.tenantId,
      ctx.periodStart,
      ctx.periodEnd,
      // EU Sales List is strictly accrual typically? Or follows VAT method?
      // Usually follows the VAT accounting method but specific rules apply.
      // For scaffold, we use the profile's method.
      ctx.profile.vatAccountingMethod
    );

    // Filter for EU Sales (schema heuristic: has customer VAT ID, non-DE country)
    // This is a simplification. Real logic needs to check country groups.
    const euLines = details.sales.filter((s) => {
      // Logic: has VAT ID && valid EU country && not DE
      // For now, we don't have full country logic here, so we rely on a hypothetical flag or simplistic check
      // We'll pass all 'likely' candidates
      return s.customer && s.customer.length > 0; // Placeholder
    });

    const totalAmount = euLines.reduce((sum, line) => sum + line.netAmountCents, 0);

    const reportLines = euLines.map((line) => ({
      section: "GOODS", // Default
      label: line.customer || "Unknown",
      netAmountCents: line.netAmountCents,
      taxAmountCents: 0, // Reverse charge/exempt
      meta: {
        vatId: "Unknown", // Need to fetch from invoice/customer data
        country: "Unknown",
      },
    }));

    return {
      amountDueCents: 0, // Informational return, no payment usually
      meta: {
        lineCount: euLines.length,
        generatedAt: new Date().toISOString(),
      },
      lines: reportLines,
    };
  }

  getDueDate(periodEnd: Date): Date {
    // DE: 25th day of month following period
    const nextDay = new Date(periodEnd);
    nextDay.setDate(nextDay.getDate() + 1);

    return new Date(nextDay.getFullYear(), nextDay.getMonth(), 25);
  }
}
