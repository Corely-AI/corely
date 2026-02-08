import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { OutboxRepository } from "@corely/data";
import { EventHandler } from "./event-handler.interface";
import { EnvService } from "@corely/config";
import { Runner, RunnerReport, TickContext } from "../../application/runner.interface";

@Injectable()
export class OutboxPollerService implements OnModuleInit, OnModuleDestroy, Runner {
  private readonly logger = new Logger(OutboxPollerService.name);
  private intervalId: NodeJS.Timeout | undefined;
  private handlers = new Map<string, EventHandler>();

  public readonly name = "outbox";

  constructor(
    private readonly outboxRepo: OutboxRepository,
    private readonly env: EnvService,
    handlers: EventHandler[]
  ) {
    for (const handler of handlers) {
      this.handlers.set(handler.eventType, handler);
    }
  }

  onModuleInit() {
    // Only start polling if not disabled
    if (this.env.WORKER_DISABLE_POLLING !== "true") {
      this.startPolling();
    }
  }

  private startPolling() {
    this.intervalId = setInterval(async () => {
      await this.processBatch(10);
    }, 5000);
  }

  async run(ctx: TickContext): Promise<RunnerReport> {
    const budgetMs = ctx.budgets.perRunnerMaxMs;
    const budgetItems = ctx.budgets.perRunnerMaxItems;
    const startTime = Date.now();

    let totalProcessed = 0;
    let totalErrors = 0;

    this.logger.log(`Starting outbox run with budgetMs=${budgetMs} budgetItems=${budgetItems}`);

    while (true) {
      if (Date.now() - startTime > budgetMs) {
        this.logger.log("Outbox run time budget exhausted");
        break;
      }
      if (totalProcessed >= budgetItems) {
        this.logger.log("Outbox run item budget exhausted");
        break;
      }

      const batchSize = Math.min(10, budgetItems - totalProcessed);
      const results = await this.processBatch(batchSize);

      totalProcessed += results.processed;
      totalErrors += results.errors;

      // If we fetched fewer than requested, we are done
      if (results.processed === 0) {
        break;
      }
    }

    return {
      processedCount: totalProcessed,
      updatedCount: totalProcessed,
      skippedCount: 0,
      errorCount: totalErrors,
      durationMs: Date.now() - startTime,
    };
  }

  private async processBatch(limit: number): Promise<{ processed: number; errors: number }> {
    const events = await this.outboxRepo.fetchPending(limit);
    if (events.length === 0) {
      return { processed: 0, errors: 0 };
    }

    let errorCount = 0;
    for (const event of events) {
      try {
        const handler = this.handlers.get(event.eventType);
        if (handler) {
          await handler.handle(event);
        } else {
          this.logger.warn(`No handler found for event type: ${event.eventType}`);
        }
        await this.outboxRepo.markSent(event.id);
      } catch (error) {
        this.logger.error(`Failed to publish event: ${event.id}`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.outboxRepo.markFailed(event.id, errorMessage);
        errorCount++;
      }
    }

    return { processed: events.length, errors: errorCount };
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
