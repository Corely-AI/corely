import { Injectable } from "@nestjs/common";
import {
  ReportStrategy,
  ReportGenerationContext,
  ReportGenerationResult,
} from "../../report-strategy.interface";

@Injectable()
export class IncomeTaxDeStrategy implements ReportStrategy {
  readonly type = "INCOME_TAX";
  readonly countryCode = "DE";

  async isRequired(ctx: ReportGenerationContext): Promise<boolean> {
    // Annual check, only if period is 'year' basically.
    // Assuming the generator calls this only for annual contexts or we check duration.
    const duration = ctx.periodEnd.getTime() - ctx.periodStart.getTime();
    const days = duration / (1000 * 3600 * 24);
    return days > 360; // Roughly a year
  }

  async generate(ctx: ReportGenerationContext): Promise<ReportGenerationResult> {
    // Scaffold: just a placeholder for now
    return {
      amountDueCents: 0,
      meta: {
        status: "CHECKLIST_ONLY",
        notes: "This is a meta-report to track annual income tax filing status.",
      },
    };
  }

  getDueDate(periodEnd: Date, ctx?: ReportGenerationContext): Date {
    // DE: July 31st of following year (standard) or Feb 28th of year after next (advisor)
    const year = periodEnd.getFullYear();
    const nextYear = year + 1;

    if (ctx?.profile.usesTaxAdvisor) {
      // 28.02 of year+2
      // e.g. 2025 -> 28.02.2027
      return new Date(year + 2, 1, 28);
    }

    // 31.07 of year+1
    return new Date(nextYear, 6, 31);
  }
}
