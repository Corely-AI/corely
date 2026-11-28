import { createEmployeeTaskEventHandlers } from "./employee-task-recorded.handler";
import { Logger } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { OutboxRepository } from "@corely/data";
import type { EnvService } from "@corely/config";
import { OutboxPollerService } from "../outbox/outbox-poller.service";
const types = [
  "tasks.task.create",
  "tasks.task.update",
  "tasks.task.complete",
  "tasks.task.reopen",
  "tasks.task.checklist",
];
function fixture() {
  const events = types.map((eventType, index) => ({
    id: `event-${index}`,
    tenantId: "tenant",
    eventType,
    payload: {
      workspaceId: "workspace",
      taskId: "35f708b5-cbda-4bc1-bcee-51506c9e6018",
      version: index + 1,
    },
  }));
  const repo = {
    getQueueStats: vi.fn(async () => ({
      duePendingCount: events.length,
      oldestDuePendingAgeMs: 0,
    })),
    claimPending: vi.fn().mockResolvedValueOnce(events).mockResolvedValue([]),
    markSent: vi.fn(async () => true),
    extendLease: vi.fn(async () => true),
    markFailed: vi.fn(async () => ({ outcome: "failed" as const, attempts: 1 })),
  };
  const env = {
    OUTBOX_BATCH_SIZE: 10,
    OUTBOX_CONCURRENCY: 2,
    OUTBOX_LEASE_DURATION_MS: 30000,
    OUTBOX_LEASE_HEARTBEAT_MS: 10000,
    OUTBOX_MAX_ATTEMPTS: 3,
    OUTBOX_RETRY_BASE_MS: 100,
    OUTBOX_RETRY_MAX_MS: 1000,
    OUTBOX_RETRY_JITTER_MS: 0,
    PDF_RENDER_CONCURRENCY: 1,
  } as EnvService;
  return { repo, env };
}
describe("Employee task lifecycle events in the API-hosted outbox", () => {
  it("acknowledges every emitted task fact instead of permanently failing the queue", async () => {
    const { repo, env } = fixture();
    const poller = new OutboxPollerService(
      repo as unknown as OutboxRepository,
      env,
      createEmployeeTaskEventHandlers()
    );
    const result = await poller.run({
      runId: "test-task-events",
      startedAt: new Date(),
      budgets: { perRunnerMaxMs: 3000, perRunnerMaxItems: 10, overallMaxMs: 3000 },
      logger: new Logger("TaskEventTest"),
    });
    expect(result).toMatchObject({ processedCount: 5, errorCount: 0 });
    expect(repo.markSent).toHaveBeenCalledTimes(5);
    expect(repo.markFailed).not.toHaveBeenCalled();
  });
  it("keeps unknown events as failures and rejects malformed task facts", async () => {
    const handlers = createEmployeeTaskEventHandlers();
    const handler = handlers[0];
    await expect(
      handler.handle({
        id: "bad",
        tenantId: "tenant",
        eventType: handler.eventType,
        payload: { workspaceId: "workspace", taskId: "invalid", version: 1 },
      })
    ).rejects.toMatchObject({ permanent: true });
    const { repo, env } = fixture();
    repo.claimPending
      .mockReset()
      .mockResolvedValueOnce([
        { id: "unknown", tenantId: "tenant", eventType: "tasks.unknown", payload: {} },
      ])
      .mockResolvedValue([]);
    const result = await new OutboxPollerService(
      repo as unknown as OutboxRepository,
      env,
      handlers
    ).run({
      runId: "unknown",
      startedAt: new Date(),
      budgets: { perRunnerMaxMs: 3000, perRunnerMaxItems: 10, overallMaxMs: 3000 },
      logger: new Logger("TaskEventTest"),
    });
    expect(result.errorCount).toBe(1);
    expect(repo.markFailed).toHaveBeenCalledWith(
      "unknown",
      expect.objectContaining({ retryable: false })
    );
  });
});
