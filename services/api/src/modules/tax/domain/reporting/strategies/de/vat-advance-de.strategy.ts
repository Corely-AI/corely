import { Injectable } from "@nestjs/common";
import {
  ReportStrategy,
  ReportGenerationContext,
  ReportGenerationResult,
} from "../../report-strategy.interface";
import { VatPeriodQueryPort } from "../../../ports/vat-period-query.port";

@Injectable()
export class VatAdvanceDeStrategy implements ReportStrategy {
  readonly type = "VAT_ADVANCE";
  readonly countryCode = "DE";

  constructor(private readonly vatQuery: VatPeriodQueryPort) {}

  async isRequired(ctx: ReportGenerationContext): Promise<boolean> {
    // Required if VAT enabled and not small business (Kleinunternehmer)
    // Small business might still file annual but not advance
    return !!(ctx.profile.vatEnabled && ctx.profile.regime !== "SMALL_BUSINESS");
  }

  async generate(ctx: ReportGenerationContext): Promise<ReportGenerationResult> {
    const inputs = await this.vatQuery.getInputs(
      ctx.tenantId,
      ctx.periodStart,
      ctx.periodEnd,
      ctx.profile.vatAccountingMethod
    );

    const netAmountDue = inputs.salesVatCents - inputs.purchaseVatCents;

    return {
      amountDueCents: netAmountDue,
      meta: {
        inputs,
        generatedAt: new Date().toISOString(),
      },
      lines: [], // Lines not typically stored directly in report meta for VAT, but in snapshot
    };
  }

  getDueDate(periodEnd: Date): Date {
    // DE: 10th day of the month following the period
    const nextDay = new Date(periodEnd);
    nextDay.setDate(nextDay.getDate() + 1); // Move to 1st of next month (assuming periodEnd is last day)

    // Set to 10th
    const dueDate = new Date(nextDay.getFullYear(), nextDay.getMonth(), 10);

    // If weekend, it shifts? strict rule says 10th, weekend shift logic usually applied at runtime display or extension.
    // For now, simple 10th rule.
    return dueDate;
  }
}
