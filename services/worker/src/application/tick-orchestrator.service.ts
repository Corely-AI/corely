import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
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
    private readonly env: EnvService,
    private readonly jobLockService: JobLockService,
    @Inject(forwardRef(() => OutboxPollerService))
    private readonly outboxRunner: OutboxPollerService,
    @Inject(forwardRef(() => InvoiceReminderRunnerService))
    private readonly invoiceRunner: InvoiceReminderRunnerService,
    @Inject(forwardRef(() => MonthlyBillingRunnerService))
    private readonly classesBillingRunner: MonthlyBillingRunnerService
  ) {
    this.logger.log(
      `TickOrchestrator constructor: outboxRunner=${!!this.outboxRunner}, invoiceRunner=${!!this.invoiceRunner}, classesBillingRunner=${!!this.classesBillingRunner}`
    );

    // Register available runners
    if (this.outboxRunner) {
      this.registerRunner(this.outboxRunner);
    }
    if (this.invoiceRunner) {
      this.registerRunner(this.invoiceRunner);
    }
    if (this.classesBillingRunner) {
      this.registerRunner(this.classesBillingRunner);
    }
  }

  private registerRunner(runner: Runner) {
    this.runners.set(runner.name, runner);
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
    }

    this.logger.log(
      JSON.stringify({
        msg: "tick.start",
        runId,
        runners: enabledRunnerNames,
        overallMaxMs,
      })
    );

    const results: Record<string, RunnerReport> = {};

    for (const name of enabledRunnerNames) {
      if (Date.now() - startedAt.getTime() > overallMaxMs) {
        this.logger.warn(
          JSON.stringify({
            msg: "tick.budget.exceeded",
            runId,
            runner: name,
          })
        );
        break;
      }

      const runner = this.runners.get(name);
      if (!runner) {
        this.logger.warn(
          JSON.stringify({
            msg: "tick.runner.not_found",
            runId,
            runner: name,
          })
        );
        continue;
      }

      try {
        this.logger.log(
          JSON.stringify({
            msg: "tick.runner.start",
            runId,
            runner: name,
          })
        );

        let report: RunnerReport | undefined;
        if (runner.singletonLockKey) {
          const locked = await this.jobLockService.withAdvisoryXactLock(
            { lockName: runner.singletonLockKey, runId },
            async () => runner.run(ctx)
          );
          if (!locked.acquired) {
            report = {
              processedCount: 0,
              updatedCount: 0,
              skippedCount: 1,
              errorCount: 0,
              durationMs: 0,
            };
          } else {
            report = locked.value;
          }
        } else {
          report = await runner.run(ctx);
        }

        results[name] = report ?? {
          processedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 1,
          durationMs: 0,
        };
        this.logger.log(
          JSON.stringify({
            msg: "tick.runner.end",
            runId,
            runner: name,
            report: results[name],
          })
        );
      } catch (err) {
        this.logger.error(
          JSON.stringify({
            msg: "tick.runner.failed",
            runId,
            runner: name,
            error: err instanceof Error ? err.message : String(err),
          })
        );
        results[name] = {
          processedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 1,
          durationMs: 0,
        };
      }
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processedCount, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errorCount, 0);

    this.logger.log(
      JSON.stringify({
        msg: "tick.end",
        runId,
        durationMs,
        totalProcessed,
        totalErrors,
        results,
      })
    );

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
      this.logger.warn("tick overlap prevented: tick already in flight");
      return this.inFlightRun;
    }

    const runPromise = this.runTick();
    this.inFlightRun = runPromise;
    try {
      return await runPromise;
    } finally {
      if (this.inFlightRun === runPromise) {
        this.inFlightRun = undefined;
      }
    }
  }
}
