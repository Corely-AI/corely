import { Injectable, Logger } from "@nestjs/common";
import { OutboxRepository } from "@corely/data";
import { EnvService } from "@corely/config";
import { EventHandler } from "./event-handler.interface";
import { Runner, RunnerReport, TickContext } from "../../application/runner.interface";
import { randomUUID } from "node:crypto";

class Semaphore {
  private inUse = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly permits: number) {}

  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.inUse < this.permits) {
      this.inUse += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.inUse += 1;
  }

  private release(): void {
    this.inUse = Math.max(0, this.inUse - 1);
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

type EventResult = {
  processed: number;
  errors: number;
};

class UnknownOutboxEventTypeError extends Error {
  readonly permanent = true;

  constructor(eventType: string) {
    super(`No handler found for event type: ${eventType}`);
    this.name = "UnknownOutboxEventTypeError";
  }
}

class OutboxEventTimeoutError extends Error {
  readonly retryable = true;

  constructor(eventId: string, eventType: string, timeoutMs: number) {
    super(`Event ${eventId} (${eventType}) timed out after ${timeoutMs}ms`);
    this.name = "OutboxEventTimeoutError";
  }
}

@Injectable()
export class OutboxPollerService implements Runner {
  private readonly logger = new Logger(OutboxPollerService.name);
  private readonly handlers = new Map<string, EventHandler>();
  private readonly heavyPdfEventTypes = new Set([
    "invoice.pdf.render.requested",
    "tax.report.pdf.requested",
  ]);
  private readonly workerId = `worker-${randomUUID()}`;

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

  async run(ctx: TickContext): Promise<RunnerReport> {
    const budgetMs = ctx.budgets.perRunnerMaxMs;
    const budgetItems = ctx.budgets.perRunnerMaxItems;
    const startTime = Date.now();
    const now = new Date();
    const queueStats = await this.outboxRepo.getQueueStats(now);

    const batchSize = Math.max(1, this.env.OUTBOX_BATCH_SIZE);
    const concurrency = Math.max(1, this.env.OUTBOX_CONCURRENCY);
    const leaseDurationMs = Math.max(1_000, this.env.OUTBOX_LEASE_DURATION_MS);
    const heartbeatMs = Math.max(500, this.env.OUTBOX_LEASE_HEARTBEAT_MS);
    const maxAttempts = Math.max(1, this.env.OUTBOX_MAX_ATTEMPTS);
    const retryBaseDelayMs = Math.max(100, this.env.OUTBOX_RETRY_BASE_MS);
    const retryMaxDelayMs = Math.max(retryBaseDelayMs, this.env.OUTBOX_RETRY_MAX_MS);
    const retryJitterMs = Math.max(0, this.env.OUTBOX_RETRY_JITTER_MS);
    const eventTimeoutRaw = Number(
      process.env.OUTBOX_EVENT_TIMEOUT_MS ?? Math.max(1_000, Math.floor(leaseDurationMs * 0.75))
    );
    const eventTimeoutMs =
      Number.isFinite(eventTimeoutRaw) && eventTimeoutRaw > 0 ? eventTimeoutRaw : leaseDurationMs;
    const pdfConcurrency = Math.max(1, this.env.PDF_RENDER_CONCURRENCY);
    const pdfSemaphore = new Semaphore(pdfConcurrency);

    let totalClaimed = 0;
    let totalProcessed = 0;
    let totalErrors = 0;

    this.logger.log(
      JSON.stringify({
        msg: "outbox.tick.start",
        runId: ctx.runId,
        workerId: this.workerId,
        budgetMs,
        budgetItems,
        batchSize,
        concurrency,
        pdfConcurrency,
        duePendingCount: queueStats.duePendingCount,
        oldestDuePendingAgeMs: queueStats.oldestDuePendingAgeMs,
      })
    );

    while (true) {
      if (Date.now() - startTime > budgetMs) {
        this.logger.log(
          JSON.stringify({
            msg: "outbox.budget.time_exhausted",
            runId: ctx.runId,
            workerId: this.workerId,
          })
        );
        break;
      }
      if (totalProcessed >= budgetItems) {
        this.logger.log(
          JSON.stringify({
            msg: "outbox.budget.items_exhausted",
            runId: ctx.runId,
            workerId: this.workerId,
            totalProcessed,
          })
        );
        break;
      }

      const claimLimit = Math.min(batchSize, budgetItems - totalProcessed);
      const events = await this.outboxRepo.claimPending({
        limit: claimLimit,
        workerId: this.workerId,
        leaseDurationMs,
      });
      totalClaimed += events.length;
      if (events.length === 0) {
        break;
      }

      const results = await this.processClaimedBatch({
        ctx,
        events,
        concurrency,
        leaseDurationMs,
        heartbeatMs,
        maxAttempts,
        retryBaseDelayMs,
        retryMaxDelayMs,
        retryJitterMs,
        eventTimeoutMs,
        pdfSemaphore,
      });

      totalProcessed += results.processed;
      totalErrors += results.errors;
    }

    this.logger.log(
      JSON.stringify({
        msg: "outbox.tick.end",
        runId: ctx.runId,
        workerId: this.workerId,
        claimed: totalClaimed,
        processed: totalProcessed,
        errors: totalErrors,
        durationMs: Date.now() - startTime,
      })
    );

    return {
      processedCount: totalProcessed,
      updatedCount: totalProcessed,
      skippedCount: 0,
      errorCount: totalErrors,
      durationMs: Date.now() - startTime,
    };
  }

  private async processClaimedBatch(args: {
    ctx: TickContext;
    events: Array<{
      id: string;
      tenantId: string | null;
      eventType: string;
      payload: unknown;
      correlationId?: string | null;
    }>;
    concurrency: number;
    leaseDurationMs: number;
    heartbeatMs: number;
    maxAttempts: number;
    retryBaseDelayMs: number;
    retryMaxDelayMs: number;
    retryJitterMs: number;
    eventTimeoutMs: number;
    pdfSemaphore: Semaphore;
  }): Promise<EventResult> {
    const workers = Math.min(args.concurrency, args.events.length);
    let processed = 0;
    let errors = 0;
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= args.events.length) {
          return;
        }
        const result = await this.processSingleEvent(args, args.events[index]);
        processed += result.processed;
        errors += result.errors;
      }
    };

    await Promise.all(Array.from({ length: workers }, () => worker()));
    return { processed, errors };
  }

  private async processSingleEvent(
    args: {
      ctx: TickContext;
      leaseDurationMs: number;
      heartbeatMs: number;
      maxAttempts: number;
      retryBaseDelayMs: number;
      retryMaxDelayMs: number;
      retryJitterMs: number;
      eventTimeoutMs: number;
      pdfSemaphore: Semaphore;
    },
    event: {
      id: string;
      tenantId: string | null;
      eventType: string;
      payload: unknown;
      correlationId?: string | null;
    }
  ): Promise<EventResult> {
    const tenantId = event.tenantId ?? "";
    const handler = this.handlers.get(event.eventType);
    const heartbeatEveryMs = Math.min(
      Math.max(500, args.heartbeatMs),
      Math.max(500, args.leaseDurationMs - 250)
    );
    const heartbeat = setInterval(() => {
      void this.outboxRepo
        .extendLease(event.id, this.workerId, args.leaseDurationMs)
        .then((extended) => {
          if (!extended) {
            this.logger.warn(
              JSON.stringify({
                msg: "outbox.lease.extend_skipped",
                runId: args.ctx.runId,
                workerId: this.workerId,
                eventId: event.id,
                eventType: event.eventType,
              })
            );
          }
        })
        .catch((error) => {
          this.logger.warn(
            JSON.stringify({
              msg: "outbox.lease.extend_failed",
              runId: args.ctx.runId,
              workerId: this.workerId,
              eventId: event.id,
              eventType: event.eventType,
              error: error instanceof Error ? error.message : String(error),
            })
          );
        });
    }, heartbeatEveryMs);

    const execute = async () => {
      if (handler) {
        await handler.handle({
          id: event.id,
          tenantId,
          eventType: event.eventType,
          payload: event.payload,
          correlationId: event.correlationId,
        });
      } else {
        throw new UnknownOutboxEventTypeError(event.eventType);
      }
    };

    try {
      if (this.heavyPdfEventTypes.has(event.eventType)) {
        await this.withEventTimeout(
          args.pdfSemaphore.withPermit(execute),
          event.id,
          event.eventType,
          args.eventTimeoutMs
        );
      } else {
        await this.withEventTimeout(execute(), event.id, event.eventType, args.eventTimeoutMs);
      }

      const markedSent = await this.outboxRepo.markSent(event.id, this.workerId);
      if (!markedSent) {
        this.logger.warn(
          JSON.stringify({
            msg: "outbox.mark_sent.skipped",
            runId: args.ctx.runId,
            workerId: this.workerId,
            eventId: event.id,
            eventType: event.eventType,
          })
        );
      }
      return { processed: 1, errors: 0 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const retryable = this.isRetryableError(error);
      const failed = await this.outboxRepo.markFailed(event.id, {
        workerId: this.workerId,
        error: errorMessage,
        retryable,
        maxAttempts: args.maxAttempts,
        retryBaseDelayMs: args.retryBaseDelayMs,
        retryMaxDelayMs: args.retryMaxDelayMs,
        retryJitterMs: args.retryJitterMs,
      });

      this.logger.error(
        JSON.stringify({
          msg: "outbox.event.failed",
          runId: args.ctx.runId,
          workerId: this.workerId,
          eventId: event.id,
          eventType: event.eventType,
          retryable,
          failureOutcome: failed.outcome,
          attempts: failed.attempts,
          nextAvailableAt: failed.nextAvailableAt?.toISOString(),
          error: errorMessage,
        })
      );
      return { processed: 1, errors: 1 };
    } finally {
      clearInterval(heartbeat);
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return true;
    }
    if ("retryable" in error && (error as { retryable?: unknown }).retryable === false) {
      return false;
    }
    if ("permanent" in error && (error as { permanent?: unknown }).permanent === true) {
      return false;
    }
    return true;
  }

  private async withEventTimeout<T>(
    promise: Promise<T>,
    eventId: string,
    eventType: string,
    timeoutMs: number
  ): Promise<T> {
    const boundedTimeoutMs = Math.max(1, timeoutMs);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new OutboxEventTimeoutError(eventId, eventType, boundedTimeoutMs));
      }, boundedTimeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
