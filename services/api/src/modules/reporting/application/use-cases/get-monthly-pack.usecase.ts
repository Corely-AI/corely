import { Injectable } from "@nestjs/common";
import type { GetMonthlyPackInput, GetMonthlyPackOutput } from "@corely/contracts";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  err,
  ValidationError,
  RequireTenant,
} from "@corely/kernel";
import type { ReportingQueryPort } from "../ports/reporting-query.port";

type Deps = {
  logger: LoggerPort;
  reportingQuery: ReportingQueryPort;
};

/**
 * Generates a comprehensive monthly pack report aggregating data from:
 * - P&L (revenue, COGS, gross margin)
 * - VAT (input, output, net payable)
 * - Excise (collected by product)
 * - Inventory balance (qty + value)
 * - Expiry alerts (expiring soon, expired)
 * - Import activity (shipments, landed costs)
 */
@RequireTenant()
@Injectable()
export class GetMonthlyPackUseCase extends BaseUseCase<GetMonthlyPackInput, GetMonthlyPackOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetMonthlyPackInput,
    ctx: UseCaseContext
  ): Promise<Result<GetMonthlyPackOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    // Parse dates
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    // Validate date range
    if (periodStart >= periodEnd) {
      return err(
        new ValidationError("Invalid period", {
          errors: { periodStart: "Start date must be before end date" },
        })
      );
    }

    // Query all data sections in parallel
    const [plSummary, vatSummary, exciseSummary, inventoryBalance, expiryAlerts, importActivity] =
      await Promise.all([
        this.deps.reportingQuery.getPLSummary(tenantId, periodStart, periodEnd, input.currency),
        this.deps.reportingQuery.getVATSummary(tenantId, periodStart, periodEnd, input.currency),
        this.deps.reportingQuery.getExciseSummary(tenantId, periodStart, periodEnd, input.currency),
        this.deps.reportingQuery.getInventoryBalance(tenantId, periodEnd, input.currency),
        this.deps.reportingQuery.getExpiryAlerts(tenantId, periodEnd),
        this.deps.reportingQuery.getImportActivity(
          tenantId,
          periodStart,
          periodEnd,
          input.currency
        ),
      ]);

    const report = {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      currency: input.currency,
      generatedAt: new Date().toISOString(),
      plSummary,
      vatSummary,
      exciseSummary,
      inventoryBalance,
      expiryAlerts,
      importActivity,
    };

    return ok({ report });
  }
}
