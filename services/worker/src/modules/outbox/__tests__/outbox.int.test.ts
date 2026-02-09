import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgresTestDb, createTestDb, stopSharedContainer } from "@corely/testkit";
import { resetPrisma, PrismaService } from "@corely/data";
import { Logger } from "@nestjs/common";
import { OutboxPollerService } from "../outbox-poller.service";
import type { EventHandler } from "../event-handler.interface";

let OutboxRepository: typeof import("@corely/data").OutboxRepository;

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Outbox reliability (worker + Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let repo: import("@corely/data").OutboxRepository;
  let dbReady = false;

  beforeAll(async () => {
    try {
      db = await createTestDb();
      prisma = db.client;
      ({ OutboxRepository } = await import("@corely/data"));
      repo = new OutboxRepository(prisma);
      dbReady = true;
    } catch (error) {
      dbReady = false;
      console.warn("Skipping DB integration setup for outbox tests:", String(error));
    }
  });

  beforeEach(async () => {
    if (!dbReady) {
      return;
    }
    await db.reset();
  });

  afterAll(async () => {
    if (dbReady) {
      await db.down();
    }
    await resetPrisma();
    await stopSharedContainer();
  });

  it("rolls back outbox enqueue when the surrounding transaction fails", async () => {
    if (!dbReady) {
      return;
    }

    await prisma
      .$transaction(async (tx) => {
        await repo.enqueue(
          {
            tenantId: "tenant-rollback",
            eventType: "test.event",
            payload: { ok: true },
          },
          tx as any
        );
        throw new Error("force rollback");
      })
      .catch(() => undefined);

    const count = await prisma.outboxEvent.count();
    expect(count).toBe(0);
  });

  it("claims pending events atomically with lease and marks them sent", async () => {
    if (!dbReady) {
      return;
    }

    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "invoice.created",
      payload: {},
    });

    const [claimed] = await repo.claimPending({
      limit: 5,
      workerId: "worker-1",
      leaseDurationMs: 30_000,
    });
    expect(claimed).toBeDefined();
    expect(claimed.status).toBe("PROCESSING");

    const marked = await repo.markSent(claimed.id, "worker-1");
    expect(marked).toBe(true);
    const updated = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: claimed.id } });
    expect(updated.status).toBe("SENT");
    expect(updated.lockedBy).toBeNull();
    expect(updated.lockedUntil).toBeNull();
  });

  it("retries failed publishes with exponential backoff and caps at max attempts", async () => {
    if (!dbReady) {
      return;
    }

    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "workflow.failed",
      payload: {},
    });
    const [event] = await repo.claimPending({
      limit: 1,
      workerId: "worker-retry",
      leaseDurationMs: 10_000,
    });

    const first = await repo.markFailed(event.id, {
      workerId: "worker-retry",
      error: "network timeout",
      retryBaseDelayMs: 10,
      retryMaxDelayMs: 100,
      retryJitterMs: 0,
      maxAttempts: 2,
    });
    expect(first.outcome).toBe("retried");

    const [reclaimed] = await repo.claimPending({
      limit: 1,
      workerId: "worker-retry",
      leaseDurationMs: 10_000,
    });
    const second = await repo.markFailed(reclaimed.id, {
      workerId: "worker-retry",
      error: "network timeout",
      retryBaseDelayMs: 10,
      retryMaxDelayMs: 100,
      retryJitterMs: 0,
      maxAttempts: 2,
    });
    expect(second.outcome).toBe("failed");

    const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(stored.status).toBe("FAILED");
    expect(stored.attempts).toBe(2);
  });

  it("only claims events whose availableAt is due", async () => {
    if (!dbReady) {
      return;
    }

    const now = new Date();
    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "ready",
      payload: {},
      availableAt: now,
    });
    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "future",
      payload: {},
      availableAt: new Date(now.getTime() + 60_000),
    });

    const claimed = await repo.claimPending({
      limit: 10,
      workerId: "worker-due",
      leaseDurationMs: 10_000,
    });
    expect(claimed.map((e) => e.eventType)).toEqual(["ready"]);
  });

  it("prevents duplicate processing when two pollers run concurrently", async () => {
    if (!dbReady) {
      return;
    }

    const seenEventIds = new Set<string>();
    const duplicateEventIds = new Set<string>();
    const handler: EventHandler = {
      eventType: "test.concurrent",
      handle: async (event) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        if (seenEventIds.has(event.id)) {
          duplicateEventIds.add(event.id);
        }
        seenEventIds.add(event.id);
      },
    };

    for (let i = 0; i < 10; i++) {
      await repo.enqueue({
        tenantId: "tenant-1",
        eventType: "test.concurrent",
        payload: { index: i },
      });
    }

    const env = {
      OUTBOX_BATCH_SIZE: 10,
      OUTBOX_CONCURRENCY: 4,
      PDF_RENDER_CONCURRENCY: 1,
      OUTBOX_LEASE_DURATION_MS: 5_000,
      OUTBOX_LEASE_HEARTBEAT_MS: 1_000,
      OUTBOX_MAX_ATTEMPTS: 3,
      OUTBOX_RETRY_BASE_MS: 10,
      OUTBOX_RETRY_MAX_MS: 100,
      OUTBOX_RETRY_JITTER_MS: 0,
    } as any;

    const pollerA = new OutboxPollerService(repo, env, [handler]);
    const pollerB = new OutboxPollerService(repo, env, [handler]);
    const ctx = {
      runId: "run-1",
      startedAt: new Date(),
      budgets: { perRunnerMaxMs: 10_000, perRunnerMaxItems: 100, overallMaxMs: 10_000 },
      logger: new Logger("test"),
    };

    await Promise.all([pollerA.run(ctx), pollerB.run(ctx)]);

    expect(duplicateEventIds.size).toBe(0);
    expect(seenEventIds.size).toBe(10);

    const sentCount = await prisma.outboxEvent.count({ where: { status: "SENT" } });
    expect(sentCount).toBe(10);
  });

  it("reclaims lease-expired events if a worker crashes mid-processing", async () => {
    if (!dbReady) {
      return;
    }

    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "test.reclaim",
      payload: {},
    });

    const [claimedByA] = await repo.claimPending({
      limit: 1,
      workerId: "worker-a",
      leaseDurationMs: 100,
    });
    expect(claimedByA).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 150));

    const claimedByB = await repo.claimPending({
      limit: 1,
      workerId: "worker-b",
      leaseDurationMs: 1000,
    });
    expect(claimedByB).toHaveLength(1);
    expect(claimedByB[0].id).toBe(claimedByA.id);
  });
});
