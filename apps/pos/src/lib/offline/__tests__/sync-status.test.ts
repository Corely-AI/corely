import { describe, expect, it } from "vitest";
import type { OutboxCommand, OutboxCommandStatus } from "@corely/offline-core";
import {
  deriveSyncBadgeStatus,
  matchesSyncFilter,
  type SyncFilterKey,
} from "@/lib/offline/sync-status";

function buildCommand(status: OutboxCommand["status"]): OutboxCommand {
  return {
    commandId: "cmd-1",
    workspaceId: "workspace-1",
    type: "pos.sale.finalize",
    payload: {},
    createdAt: new Date("2026-03-25T12:00:00.000Z"),
    status,
    attempts: 0,
    nextAttemptAt: null,
    idempotencyKey: "idem-1",
  };
}

describe("matchesSyncFilter", () => {
  it("treats in-flight commands as part of the pending filter", () => {
    expect(matchesSyncFilter(buildCommand("IN_FLIGHT"), "PENDING")).toBe(true);
  });

  it.each<Exclude<SyncFilterKey, "ALL" | "PENDING">>(["FAILED", "CONFLICT", "SUCCEEDED"])(
    "matches exact status filters for %s",
    (filter) => {
      expect(matchesSyncFilter(buildCommand(filter as OutboxCommandStatus), filter)).toBe(true);
    }
  );
});

describe("deriveSyncBadgeStatus", () => {
  it("prefers in-flight when the engine is actively syncing", () => {
    expect(
      deriveSyncBadgeStatus({
        syncStatus: "syncing",
        queueStats: { pending: 1, failed: 0, conflicts: 0, succeeded: 0, inFlight: 0 },
      })
    ).toBe("IN_FLIGHT");
  });

  it("surfaces failed work over a generic success badge", () => {
    expect(
      deriveSyncBadgeStatus({
        syncStatus: "idle",
        queueStats: { pending: 0, failed: 1, conflicts: 0, succeeded: 8, inFlight: 0 },
      })
    ).toBe("FAILED");
  });

  it("surfaces pending work when the queue is not empty", () => {
    expect(
      deriveSyncBadgeStatus({
        syncStatus: "idle",
        queueStats: { pending: 2, failed: 0, conflicts: 0, succeeded: 0, inFlight: 0 },
      })
    ).toBe("PENDING");
  });
});
