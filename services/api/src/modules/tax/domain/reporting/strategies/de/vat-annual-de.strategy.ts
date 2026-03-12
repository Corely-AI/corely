import { Injectable } from "@nestjs/common";
import {
  ReportStrategy,
  ReportGenerationContext,
  ReportGenerationResult,
} from "../../report-strategy.interface";
import { VatPeriodQueryPort } from "../../../ports/vat-period-query.port";

@Injectable()
export class VatAnnualDeStrategy implements ReportStrategy {
  readonly type = "VAT_ANNUAL";
  readonly countryCode = "DE";

  constructor(private readonly vatQuery: VatPeriodQueryPort) {}

  async isRequired(ctx: ReportGenerationContext): Promise<boolean> {
    const duration = ctx.periodEnd.getTime() - ctx.periodStart.getTime();
    const days = duration / (1000 * 3600 * 24);

    return days > 360 && ctx.profile.vatEnabled && ctx.profile.regime !== "SMALL_BUSINESS";
  }

  async generate(ctx: ReportGenerationContext): Promise<ReportGenerationResult> {
    const inputs = await this.vatQuery.getInputs(
      ctx.tenantId,
      ctx.periodStart,
      ctx.periodEnd,
      ctx.profile.vatAccountingMethod
    );

    return {
      amountDueCents: inputs.salesVatCents - inputs.purchaseVatCents,
      meta: {
        inputs,
        generatedAt: new Date().toISOString(),
      },
      lines: [],
    };
  }

  getDueDate(periodEnd: Date, ctx?: ReportGenerationContext): Date {
    const year = periodEnd.getUTCFullYear();

    if (ctx?.profile.usesTaxAdvisor) {
      return new Date(Date.UTC(year + 2, 1, 28, 23, 59, 59, 999));
    }

    return new Date(Date.UTC(year + 1, 6, 31, 23, 59, 59, 999));
  }
}
