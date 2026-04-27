import type { OutboxCommand } from "@corely/offline-core";

export type SyncFilterKey = "ALL" | "PENDING" | "FAILED" | "CONFLICT" | "SUCCEEDED";
export type SyncBadgeStatus = "PENDING" | "FAILED" | "CONFLICT" | "SUCCEEDED" | "IN_FLIGHT";

export function matchesSyncFilter(command: OutboxCommand, filter: SyncFilterKey): boolean {
  if (filter === "ALL") {
    return true;
  }
  if (filter === "PENDING") {
    return command.status === "PENDING" || command.status === "IN_FLIGHT";
  }
  return command.status === filter;
}

export function deriveSyncBadgeStatus(args: {
  syncStatus: "idle" | "syncing";
  queueStats: {
    pending: number;
    failed: number;
    conflicts: number;
    succeeded: number;
    inFlight: number;
  };
}): SyncBadgeStatus {
  const { syncStatus, queueStats } = args;

  if (syncStatus === "syncing" || queueStats.inFlight > 0) {
    return "IN_FLIGHT";
  }
  if (queueStats.failed > 0) {
    return "FAILED";
  }
  if (queueStats.conflicts > 0) {
    return "CONFLICT";
  }
  if (queueStats.pending > 0) {
    return "PENDING";
  }
  return "SUCCEEDED";
}
