import { Injectable, Logger } from "@nestjs/common";
import { type BillingAccessPort, BILLING_ACCESS_PORT } from "../../../../billing";
import { Inject } from "@nestjs/common";
import { Runner, RunnerReport, TickContext } from "../../application/runner.interface";

@Injectable()
export class TrialExpiryRunnerService implements Runner {
  private readonly logger = new Logger(TrialExpiryRunnerService.name);
  public readonly name = "billingTrials";
  public readonly singletonLockKey = "worker:scheduler:billingTrials";

  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {}

  async run(ctx: TickContext): Promise<RunnerReport> {
    const startedAt = Date.now();
    try {
      const processedCount = await this.billingAccess.expireDueTrials(
        ctx.budgets.perRunnerMaxItems
      );
      return {
        processedCount,
        updatedCount: processedCount,
        skippedCount: 0,
        errorCount: 0,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
      return {
        processedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        durationMs: Date.now() - startedAt,
      };
    }
  }
}
