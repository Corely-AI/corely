import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { JobLockService } from "../infrastructure/job-lock.service";
import { Runner, RunnerReport, TickContext } from "./runner.interface";
import { OutboxPollerService } from "../modules/outbox/outbox-poller.service";
import { InvoiceReminderRunnerService } from "../modules/invoices/invoice-reminder-runner.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class TickOrchestrator {
  private readonly logger = new Logger(TickOrchestrator.name);
  private runners: Map<string, Runner> = new Map();

  constructor(
    private readonly env: EnvService,
    private readonly jobLockService: JobLockService,
    @Inject(forwardRef(() => OutboxPollerService))
    private readonly outboxRunner: OutboxPollerService,
    @Inject(forwardRef(() => InvoiceReminderRunnerService))
    private readonly invoiceRunner: InvoiceReminderRunnerService
  ) {
    if (!this.logger) {
      // Should be initialized by property initializer, but just in case
      // this.logger = new Logger(TickOrchestrator.name);
      // Property initializers run before constructor body but after constructor parameters are evaluated.
    }
    this.logger.log(
      `TickOrchestrator constructor: outboxRunner=${!!this.outboxRunner}, invoiceRunner=${!!this.invoiceRunner}`
    );

    // Register available runners
    if (this.outboxRunner) {
      this.registerRunner(this.outboxRunner);
    }
    if (this.invoiceRunner) {
      this.registerRunner(this.invoiceRunner);
    }
  }

  private registerRunner(runner: Runner) {
    this.runners.set(runner.name, runner);
  }

  async runTick(): Promise<void> {
    const runId = uuidv4();
    this.logger.log(`Starting worker tick runId=${runId}`);

    // 1. Acquire Lock
    const lockAcquired = await this.jobLockService.tryAcquireTickLock();
    if (!lockAcquired) {
      this.logger.log(`Tick lock not acquired. Exiting tick runId=${runId}`);
      return;
    }

    try {
      const startedAt = new Date();

      // 2. Determine configuration
      const enabledRunnerNames = (this.env.WORKER_TICK_RUNNERS || "outbox,invoiceReminders")
        .split(",")
        .map((s) => s.trim());
      const overallMaxMs = Number(this.env.WORKER_TICK_OVERALL_MAX_MS || 480000); // 8 mins
      const perRunnerMaxMs = Number(this.env.WORKER_TICK_RUNNER_MAX_MS || 60000); // 60s
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

      // Sharding config
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
        `Running tick with runners=[${enabledRunnerNames.join(", ")}] overallMaxMs=${overallMaxMs}`
      );

      const results: Record<string, RunnerReport> = {};

      // 3. Run Runners
      for (const name of enabledRunnerNames) {
        // overall budget check
        if (Date.now() - startedAt.getTime() > overallMaxMs) {
          this.logger.warn(`Overall tick budget exceeded before running ${name}. Stopping.`);
          break;
        }

        const runner = this.runners.get(name);
        if (!runner) {
          this.logger.warn(`Runner ${name} not found. Skipping.`);
          continue;
        }

        try {
          this.logger.log(`Starting runner ${name}`);
          const report = await runner.run(ctx);
          results[name] = report;
          this.logger.log(`Runner ${name} completed: ${JSON.stringify(report)}`);
        } catch (err) {
          this.logger.error(`Runner ${name} failed`, err);
          results[name] = {
            processedCount: 0,
            updatedCount: 0,
            skippedCount: 0,
            errorCount: 1,
            durationMs: 0,
          };
        }
      }

      const totalDuration = Date.now() - startedAt.getTime();
      this.logger.log(
        `Tick completed runId=${runId} duration=${totalDuration}ms results=${JSON.stringify(results)}`
      );
    } finally {
      // 4. Release Lock
      await this.jobLockService.releaseTickLock();
    }
  }
}
