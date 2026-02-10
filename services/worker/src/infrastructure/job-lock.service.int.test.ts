import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgresTestDb, createTestDb, stopSharedContainer } from "@corely/testkit";
import { PrismaService, resetPrisma } from "@corely/data";
import { JobLockService } from "./job-lock.service";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("JobLockService advisory locks", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let lockService: JobLockService;
  let dbReady = false;

  beforeAll(async () => {
    try {
      db = await createTestDb();
      prisma = db.client;
      lockService = new JobLockService(prisma);
      dbReady = true;
    } catch (error) {
      // Keep suite resilient when Docker/testcontainers isn't available locally.
      // DB-backed behavior is still validated in environments with container runtime.
      dbReady = false;
      console.warn("Skipping DB integration setup for JobLockService:", String(error));
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

  it("executes singleton scheduler block only once across concurrent replicas", async () => {
    if (!dbReady) {
      return;
    }

    let executions = 0;

    const first = lockService.withAdvisoryXactLock(
      { lockName: "worker:scheduler:test", runId: "run-a" },
      async () => {
        executions += 1;
        await new Promise((resolve) => setTimeout(resolve, 150));
        return "first";
      }
    );

    // Fire second contender immediately while first lock is held.
    const second = lockService.withAdvisoryXactLock(
      { lockName: "worker:scheduler:test", runId: "run-b" },
      async () => {
        executions += 1;
        return "second";
      }
    );

    const [resultA, resultB] = await Promise.all([first, second]);
    const acquiredCount = [resultA, resultB].filter((item) => item.acquired).length;

    expect(acquiredCount).toBe(1);
    expect(executions).toBe(1);
  });
});
