import { randomUUID } from "node:crypto";
import { EnvService, envSchema } from "@corely/config";
import { OutboxRepository, PrismaService } from "@corely/data";
import { Logger } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { OutboxPollerService } from "./outbox-poller.service";

const url = process.env.OUTBOX_RECOVERY_TEST_DATABASE_URL;
const disposable =
  url && /^postgresql:\/\/[^/]*@127\.0\.0\.1:\d+\/corely_rehearsal_333_[a-z0-9_]+$/.test(url);
const tenantId = randomUUID();
const eventType = "rehearsal.recovery";
const privateText = "synthetic-private-input@example.invalid";

describe.skipIf(!disposable)("API outbox recovery", () => {
  let prisma: PrismaService;
  let repo: OutboxRepository;
  let env: EnvService;
  const tick = {
    runId: "synthetic-recovery-tick",
    startedAt: new Date(),
    budgets: { overallMaxMs: 5_000, perRunnerMaxMs: 4_000, perRunnerMaxItems: 1 },
    logger: new Logger("OutboxRecovery"),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    prisma = new PrismaService();
    await prisma.$connect();
    repo = new OutboxRepository(prisma);
    env = new EnvService(
      envSchema.parse({
        DATABASE_URL: url,
        OUTBOX_MAX_ATTEMPTS: 2,
        OUTBOX_RETRY_BASE_MS: 100,
        OUTBOX_RETRY_JITTER_MS: 0,
      })
    );
  }, 20_000);

  afterAll(async () => {
    await prisma?.outboxEvent.deleteMany({ where: { tenantId } });
    await prisma?.onModuleDestroy();
  });

  it("keeps a failed delivery diagnosable and retries the same event after an ambiguous outcome", async () => {
    const effects = new Set<string>();
    const observed: string[] = [];
    const log = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    const poller = new OutboxPollerService(repo, env, [
      {
        eventType,
        async handle(event) {
          effects.add(event.id);
          observed.push(event.id);
          if (observed.length === 1) throw new Error(privateText);
        },
      },
    ]);
    try {
      await repo.enqueue({
        tenantId,
        eventType,
        payload: { privateText },
        correlationId: privateText,
      });
      expect((await poller.run(tick)).errorCount).toBe(1);
      const event = await prisma.outboxEvent.findFirstOrThrow({ where: { tenantId, eventType } });
      expect(event).toMatchObject({ status: "PENDING", attempts: 1, lastError: "HANDLER_FAILED" });
      const failure = JSON.stringify(log.mock.calls);
      expect(failure).not.toContain(privateText);
      expect(failure).toContain(event.id);
      expect(failure).toContain("failureOutcome");
      expect(failure).toContain("retried");
      expect(failure).toContain("correlationKey");
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { availableAt: new Date(0) },
      });
      expect((await poller.run(tick)).errorCount).toBe(0);
      const sent = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(sent).toMatchObject({ status: "SENT", attempts: 1, lastError: null });
      expect(observed).toEqual([event.id, event.id]);
      expect(effects.size).toBe(1);
    } finally {
      log.mockRestore();
    }
  });

  it("keeps a permanent failure terminal after delivery replaces a stale lease", async () => {
    const unhandled = eventType + ".unhandled";
    await repo.enqueue({ tenantId, eventType: unhandled, payload: {} });
    const [oldLease] = await repo.claimPending({
      limit: 1,
      workerId: "worker-before",
      leaseDurationMs: 1000,
    });
    await prisma.outboxEvent.update({
      where: { id: oldLease.id },
      data: { lockedUntil: new Date(0) },
    });
    const [replacement] = await repo.claimPending({
      limit: 1,
      workerId: "worker-after",
      leaseDurationMs: 1000,
    });
    expect(replacement.id).toBe(oldLease.id);
    expect(
      await repo.markFailed(oldLease.id, { workerId: "worker-before", error: "HANDLER_FAILED" })
    ).toEqual({ outcome: "skipped" });
    expect(
      await repo.markFailed(replacement.id, {
        workerId: "worker-after",
        error: "NO_HANDLER",
        retryable: false,
      })
    ).toMatchObject({ outcome: "failed" });
    expect(
      await repo.claimPending({ limit: 1, workerId: "later-worker", leaseDurationMs: 1000 })
    ).toEqual([]);
    const failed = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: replacement.id } });
    expect(failed).toMatchObject({ status: "FAILED", attempts: 1, lastError: "NO_HANDLER" });
  });
});
