import { describe, expect, it } from "vitest";
import type { OutboxCommand } from "@corely/offline-core";
import {
  appendSyncLogWeb,
  exportSyncLogsWeb,
  WebOutboxStore,
  writeSyncStateWeb,
} from "@/lib/offline/webOutboxStore";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function buildCommand(overrides: Partial<OutboxCommand> = {}): OutboxCommand {
  const command: OutboxCommand = {
    commandId: overrides.commandId ?? "command-1",
    workspaceId: overrides.workspaceId ?? "workspace-1",
    type: overrides.type ?? "pos.sale.finalize",
    payload: overrides.payload ?? { saleId: "sale-1" },
    createdAt: overrides.createdAt ?? new Date("2026-03-25T18:00:00.000Z"),
    status: overrides.status ?? "PENDING",
    attempts: overrides.attempts ?? 0,
    nextAttemptAt: overrides.nextAttemptAt ?? null,
    idempotencyKey: overrides.idempotencyKey ?? "idem-1",
  };

  if (overrides.clientTraceId) {
    command.clientTraceId = overrides.clientTraceId;
  }
  if (overrides.meta !== undefined) {
    command.meta = overrides.meta;
  }
  if (overrides.error) {
    command.error = overrides.error;
  }
  if (overrides.conflict !== undefined) {
    command.conflict = overrides.conflict;
  }

  return command;
}

describe("WebOutboxStore", () => {
  it("persists and lists pending commands without SQLite", async () => {
    const storage = createMemoryStorage();
    const store = new WebOutboxStore(storage);
    await store.initialize();

    await store.enqueue(buildCommand({ commandId: "command-1" }));
    await store.enqueue(
      buildCommand({
        commandId: "command-2",
        createdAt: new Date("2026-03-25T18:01:00.000Z"),
        nextAttemptAt: new Date("2099-03-25T18:02:00.000Z"),
      })
    );

    const pendingNow = await store.listPending("workspace-1", 10);
    expect(pendingNow).toHaveLength(1);
    expect(pendingNow[0]?.commandId).toBe("command-1");

    await store.markInFlight("command-1");
    await store.markSucceeded("command-1", { serverVersion: 1 });

    const commands = await store.findByWorkspace("workspace-1");
    expect(commands[0]?.commandId).toBe("command-2");
    expect(commands[1]).toMatchObject({
      commandId: "command-1",
      status: "SUCCEEDED",
      meta: { serverVersion: 1 },
    });
  });

  it("supports retry reset, deletion, and sync log export", async () => {
    const storage = createMemoryStorage();
    const store = new WebOutboxStore(storage);
    await store.initialize();

    await store.enqueue(
      buildCommand({
        commandId: "command-1",
        status: "FAILED",
        attempts: 2,
        error: { message: "boom", retryable: true },
      })
    );

    await store.resetToPending("command-1");
    const reset = await store.getById("command-1");
    expect(reset).toMatchObject({
      commandId: "command-1",
      status: "PENDING",
      attempts: 2,
    });
    expect(reset?.error).toBeUndefined();

    await appendSyncLogWeb(
      {
        workspaceId: "workspace-1",
        level: "INFO",
        message: "manual sync completed",
        meta: { processed: 0 },
      },
      storage
    );
    await writeSyncStateWeb("sync:last_sync_at", "2026-03-25T18:05:00.000Z", storage);

    const logs = await exportSyncLogsWeb("workspace-1", storage);
    expect(logs).toContain("manual sync completed");

    await store.deleteById("command-1");
    expect(await store.getById("command-1")).toBeNull();
  });
});
