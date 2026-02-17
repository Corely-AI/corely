import { describe, expect, it, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { OutboxPollerService } from "./outbox-poller.service";

const buildCtx = () => ({
  runId: "run-test",
  startedAt: new Date(),
  budgets: {
    perRunnerMaxMs: 5_000,
    perRunnerMaxItems: 50,
    overallMaxMs: 10_000,
  },
  logger: new Logger("OutboxPollerServiceSpec"),
});

const buildEnv = (overrides?: Partial<Record<string, number>>) =>
  ({
    OUTBOX_BATCH_SIZE: 10,
    OUTBOX_CONCURRENCY: 2,
    PDF_RENDER_CONCURRENCY: 1,
    OUTBOX_LEASE_DURATION_MS: 5_000,
    OUTBOX_LEASE_HEARTBEAT_MS: 1_000,
    OUTBOX_MAX_ATTEMPTS: 3,
    OUTBOX_RETRY_BASE_MS: 100,
    OUTBOX_RETRY_MAX_MS: 1_000,
    OUTBOX_RETRY_JITTER_MS: 0,
    OUTBOX_EVENT_TIMEOUT_MS: 50,
    ...overrides,
  }) as any;

describe("OutboxPollerService reliability guards", () => {
  it("marks unknown event types as failed instead of sent", async () => {
    const outboxRepo = {
      getQueueStats: vi.fn().mockResolvedValue({ duePendingCount: 1, oldestDuePendingAgeMs: 0 }),
      claimPending: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "evt-1",
            tenantId: "tenant-1",
            eventType: "unknown.event",
            payload: {},
            correlationId: null,
          },
        ])
        .mockResolvedValueOnce([]),
      extendLease: vi.fn().mockResolvedValue(true),
      markSent: vi.fn().mockResolvedValue(true),
      markFailed: vi
        .fn()
        .mockResolvedValue({ outcome: "failed", attempts: 1, nextAvailableAt: undefined }),
    } as any;

    const service = new OutboxPollerService(outboxRepo, buildEnv(), []);

    const report = await service.run(buildCtx());

    expect(outboxRepo.markFailed).toHaveBeenCalledTimes(1);
    expect(outboxRepo.markSent).not.toHaveBeenCalled();
    expect(report.errorCount).toBe(1);
  });

  it("marks timed-out handler events as failed and retryable", async () => {
    const previousTimeout = process.env.OUTBOX_EVENT_TIMEOUT_MS;
    process.env.OUTBOX_EVENT_TIMEOUT_MS = "20";

    const outboxRepo = {
      getQueueStats: vi.fn().mockResolvedValue({ duePendingCount: 1, oldestDuePendingAgeMs: 0 }),
      claimPending: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "evt-timeout",
            tenantId: "tenant-1",
            eventType: "slow.event",
            payload: {},
            correlationId: null,
          },
        ])
        .mockResolvedValueOnce([]),
      extendLease: vi.fn().mockResolvedValue(true),
      markSent: vi.fn().mockResolvedValue(true),
      markFailed: vi
        .fn()
        .mockResolvedValue({ outcome: "retried", attempts: 1, nextAvailableAt: new Date() }),
    } as any;

    const handler = {
      eventType: "slow.event",
      handle: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }),
    };

    try {
      const service = new OutboxPollerService(outboxRepo, buildEnv(), [handler]);
      const report = await service.run(buildCtx());

      expect(outboxRepo.markFailed).toHaveBeenCalledTimes(1);
      expect(outboxRepo.markFailed).toHaveBeenCalledWith(
        "evt-timeout",
        expect.objectContaining({ retryable: true })
      );
      expect(outboxRepo.markSent).not.toHaveBeenCalled();
      expect(report.errorCount).toBe(1);
    } finally {
      if (previousTimeout === undefined) {
        delete process.env.OUTBOX_EVENT_TIMEOUT_MS;
      } else {
        process.env.OUTBOX_EVENT_TIMEOUT_MS = previousTimeout;
      }
    }
  });
});
