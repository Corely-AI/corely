import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { JobLockService } from "../infrastructure/job-lock.service";
import { Runner, RunnerReport, TickContext } from "./runner.interface";
import { OutboxPollerService } from "../modules/outbox/outbox-poller.service";
import { InvoiceReminderRunnerService } from "../modules/invoices/invoice-reminder-runner.service";
import { MonthlyBillingRunnerService } from "../modules/classes/monthly-billing-runner.service";
import { v4 as uuidv4 } from "uuid";

export interface TickRunSummary {
  runId: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  runnerResults: Record<string, RunnerReport>;
  totalProcessed: number;
  totalErrors: number;
}

@Injectable()
export class TickOrchestrator {
  private readonly logger = new Logger(TickOrchestrator.name);
  private readonly runners: Map<string, Runner> = new Map();
  private inFlightRun?: Promise<TickRunSummary>;

  constructor(
    @Inject(EnvService) private readonly env: EnvService,
    @Inject(JobLockService) private readonly jobLockService: JobLockService,
    @Optional() @Inject(OutboxPollerService) private readonly outboxRunner: OutboxPollerService,
    @Optional()
    @Inject(InvoiceReminderRunnerService)
    private readonly invoiceRunner: InvoiceReminderRunnerService,
    @Optional()
    @Inject(MonthlyBillingRunnerService)
    private readonly classesBillingRunner: MonthlyBillingRunnerService
  ) {
    this.logger.log(
      `[init] TickOrchestrator created — outboxRunner=${!!this.outboxRunner}, invoiceRunner=${!!this.invoiceRunner}, classesBillingRunner=${!!this.classesBillingRunner}`
    );

    // Register available runners
    const candidates = [this.outboxRunner, this.invoiceRunner, this.classesBillingRunner];
    for (const runner of candidates) {
      if (runner) {
        this.registerRunner(runner);
      }
    }

    this.logger.log(
      `[init] Registered ${this.runners.size} runners: [${Array.from(this.runners.keys()).join(", ")}]`
    );
  }

  private registerRunner(runner: Runner) {
    this.runners.set(runner.name, runner);
    this.logger.log(
      `[init] Registered runner "${runner.name}" (lock=${runner.singletonLockKey ?? "none"})`
    );
  }

  private async runTick(): Promise<TickRunSummary> {
    const runId = uuidv4();
    const startedAt = new Date();

    const enabledRunnerNames = (
      this.env.WORKER_TICK_RUNNERS || "outbox,invoiceReminders,classesBilling"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const overallMaxMs = Number(this.env.WORKER_TICK_OVERALL_MAX_MS || 480000);
    const perRunnerMaxMs = Number(this.env.WORKER_TICK_RUNNER_MAX_MS || 60000);
    const perRunnerMaxItems = Number(this.env.WORKER_TICK_RUNNER_MAX_ITEMS || 200);

    const ctx: TickContext = {
      runId,
      startedAt,
      budgets: {
        overallMaxMs,
        perRunnerMaxMs,
        perRunnerMaxItems,
      },
      logger: this.logger,
    };

    if (
      this.env.WORKER_TICK_SHARD_INDEX !== undefined &&
      this.env.WORKER_TICK_SHARD_COUNT !== undefined
    ) {
      ctx.tenantIterationPolicy = {
        shardIndex: Number(this.env.WORKER_TICK_SHARD_INDEX),
        shardCount: Number(this.env.WORKER_TICK_SHARD_COUNT),
      };
      this.logger.log(
        `[tick:${runId}] Sharding enabled: index=${ctx.tenantIterationPolicy.shardIndex} count=${ctx.tenantIterationPolicy.shardCount}`
      );
    }

    const registeredNames = Array.from(this.runners.keys());
    this.logger.log(
      `[tick:${runId}] === TICK START === enabled=[${enabledRunnerNames.join(",")}] registered=[${registeredNames.join(",")}] budgets={overall=${overallMaxMs}ms, perRunner=${perRunnerMaxMs}ms, maxItems=${perRunnerMaxItems}}`
    );

    const results: Record<string, RunnerReport> = {};

    for (let i = 0; i < enabledRunnerNames.length; i++) {
      const name = enabledRunnerNames[i];
      const elapsedMs = Date.now() - startedAt.getTime();

      if (elapsedMs > overallMaxMs) {
        this.logger.warn(
          `[tick:${runId}] Overall budget exceeded (${elapsedMs}ms > ${overallMaxMs}ms), skipping remaining runners: [${enabledRunnerNames.slice(i).join(",")}]`
        );
        break;
      }

      const runner = this.runners.get(name);
      if (!runner) {
        this.logger.warn(
          `[tick:${runId}] Runner "${name}" not found in registry (available: [${registeredNames.join(",")}])`
        );
        continue;
      }

      const runnerStart = Date.now();
      try {
        this.logger.log(
          `[tick:${runId}] Runner "${name}" starting (${i + 1}/${enabledRunnerNames.length}, elapsed=${elapsedMs}ms, lock=${runner.singletonLockKey ?? "none"})...`
        );

        let report: RunnerReport | undefined;
        if (runner.singletonLockKey) {
          this.logger.log(
            `[tick:${runId}] Runner "${name}" acquiring advisory lock "${runner.singletonLockKey}"...`
          );
          const locked = await this.jobLockService.withAdvisoryXactLock(
            { lockName: runner.singletonLockKey, runId },
            async () => runner.run(ctx)
          );
          if (!locked.acquired) {
            this.logger.log(
              `[tick:${runId}] Runner "${name}" lock not acquired (another instance holds it), skipped`
            );
            report = {
              processedCount: 0,
              updatedCount: 0,
              skippedCount: 1,
              errorCount: 0,
              durationMs: Date.now() - runnerStart,
            };
          } else {
            this.logger.log(`[tick:${runId}] Runner "${name}" lock acquired, execution completed`);
            report = locked.value;
          }
        } else {
          report = await runner.run(ctx);
        }

        const runnerDurationMs = Date.now() - runnerStart;
        results[name] = report ?? {
          processedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 1,
          durationMs: runnerDurationMs,
        };
        this.logger.log(
          `[tick:${runId}] Runner "${name}" finished in ${runnerDurationMs}ms — processed=${results[name].processedCount} updated=${results[name].updatedCount} skipped=${results[name].skippedCount} errors=${results[name].errorCount}`
        );
      } catch (err) {
        const runnerDurationMs = Date.now() - runnerStart;
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStack = err instanceof Error ? err.stack : undefined;
        this.logger.error(
          `[tick:${runId}] Runner "${name}" FAILED after ${runnerDurationMs}ms — ${errMsg}`
        );
        if (errStack) {
          this.logger.error(`[tick:${runId}] Stack: ${errStack}`);
        }
        results[name] = {
          processedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 1,
          durationMs: runnerDurationMs,
        };
      }
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processedCount, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errorCount, 0);
    const runnersExecuted = Object.keys(results).length;

    this.logger.log(
      `[tick:${runId}] === TICK END === durationMs=${durationMs} runnersExecuted=${runnersExecuted}/${enabledRunnerNames.length} totalProcessed=${totalProcessed} totalErrors=${totalErrors}`
    );
    for (const [name, report] of Object.entries(results)) {
      this.logger.log(
        `[tick:${runId}]   ${name}: processed=${report.processedCount} updated=${report.updatedCount} skipped=${report.skippedCount} errors=${report.errorCount} duration=${report.durationMs}ms`
      );
    }

    return {
      runId,
      startedAt,
      finishedAt,
      durationMs,
      runnerResults: results,
      totalProcessed,
      totalErrors,
    };
  }

  async runOnce(): Promise<TickRunSummary> {
    if (this.inFlightRun) {
      this.logger.warn("[runOnce] Tick overlap prevented — waiting for in-flight tick to complete");
      return this.inFlightRun;
    }

    this.logger.log("[runOnce] Starting new tick...");
    const runPromise = this.runTick();
    this.inFlightRun = runPromise;
    try {
      return await runPromise;
    } finally {
      if (this.inFlightRun === runPromise) {
        this.inFlightRun = undefined;
      }
      this.logger.log("[runOnce] Tick promise settled, slot cleared");
    }
  }
}
