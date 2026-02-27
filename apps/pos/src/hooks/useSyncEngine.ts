import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as Clipboard from "expo-clipboard";
import { v4 as uuidv4 } from "@lukeed/uuid";
import {
  SyncEngine,
  type FlushStats,
  type OutboxCommand,
  type SyncEngineEvent,
} from "@corely/offline-core";
import { SqliteOutboxStore, ReactNativeNetworkMonitor } from "@corely/offline-rn";
import { useAuthStore } from "@/stores/authStore";
import { InMemorySyncLock } from "@/lib/offline/syncLock";
import { PosSyncTransport } from "@/lib/offline/posSyncTransport";
import { useEngagementService } from "@/hooks/useEngagementService";
import { appendSyncLog, exportSyncLogs, getPosDatabase, writeSyncState } from "@/lib/pos-db";
import { getPosLocalService } from "@/hooks/usePosLocalService";

let syncEngineInstance: SyncEngine | null = null;
let outboxStoreInstance: SqliteOutboxStore | null = null;
let syncSubscription: (() => void) | null = null;

export function useSyncEngine() {
  const [commands, setCommands] = useState<OutboxCommand[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing">("idle");
  const [isOnline, setIsOnline] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<FlushStats | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isInitializingRef = useRef(false);
  const { apiClient, user } = useAuthStore();
  const { engagementService } = useEngagementService();

  const log = useCallback(
    async (level: "INFO" | "WARN" | "ERROR", message: string, meta?: unknown) => {
      const db = await getPosDatabase();
      await appendSyncLog(db, {
        workspaceId: user?.workspaceId ?? null,
        level,
        message,
        meta,
      });
    },
    [user?.workspaceId]
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  const refreshCommands = useCallback(async () => {
    if (!outboxStoreInstance || !user?.workspaceId) {
      return;
    }

    try {
      const next = await outboxStoreInstance.findByWorkspace(user.workspaceId);
      setCommands(next);
    } catch (error) {
      console.error("Failed to refresh outbox commands:", error);
    }
  }, [user?.workspaceId]);

  const handleSyncEvent = useCallback(
    async (event: SyncEngineEvent) => {
      if (event.type === "flushStarted") {
        setSyncStatus("syncing");
        await log("INFO", "Sync flush started", event);
      }

      if (event.type === "flushFinished") {
        setSyncStatus("idle");
        setLastSyncAt(new Date());
        setLastSyncStats(event.stats);
        await writeSyncState(await getPosDatabase(), "sync:last_sync_at", new Date().toISOString());
        await writeSyncState(
          await getPosDatabase(),
          "sync:last_stats",
          JSON.stringify(event.stats)
        );
        await log("INFO", "Sync flush finished", event);
      }

      if (event.type === "conflictDetected") {
        await log("WARN", "Sync conflict detected", event);
      }

      if (event.type === "statusChanged" || event.type === "commandUpdated") {
        await refreshCommands();
      }
    },
    [log, refreshCommands]
  );

  const initializeSync = useCallback(async () => {
    if (Platform.OS === "web") {
      setIsReady(true);
      return;
    }
    if (!apiClient || isInitializingRef.current) {
      return;
    }
    isInitializingRef.current = true;
    try {
      if (!outboxStoreInstance) {
        const db = await getPosDatabase();
        outboxStoreInstance = new SqliteOutboxStore(db as never);
        await outboxStoreInstance.initialize();
      }

      if (!syncEngineInstance) {
        const lock = new InMemorySyncLock();
        const networkMonitor = new ReactNativeNetworkMonitor(NetInfo as never);
        const posLocalService = await getPosLocalService();
        const transport = new PosSyncTransport({
          apiClient,
          engagementService: engagementService ?? null,
          posLocalService,
        });

        syncEngineInstance = new SyncEngine(
          {
            store: outboxStoreInstance,
            transport,
            lock,
            networkMonitor,
            clock: { now: () => new Date() },
            idGenerator: { newId: () => uuidv4() },
            logger: {
              debug: (message: string, meta?: unknown) => console.warn("[offline]", message, meta),
              info: (message: string, meta?: unknown) => console.warn("[offline]", message, meta),
              warn: (message: string, meta?: unknown) => console.warn("[offline]", message, meta),
              error: (message: string, meta?: unknown) => console.error("[offline]", message, meta),
            },
          },
          { flushIntervalMs: 25000, batchSize: 30 }
        );
        syncEngineInstance.start();
      }

      if (syncEngineInstance && user?.workspaceId) {
        syncEngineInstance.trackWorkspace(user.workspaceId);
      }

      if (syncEngineInstance && !syncSubscription) {
        syncSubscription = syncEngineInstance.subscribe((event: SyncEngineEvent) => {
          void handleSyncEvent(event);
        });
      }

      await refreshCommands();
      setIsReady(true);
    } finally {
      isInitializingRef.current = false;
    }
  }, [apiClient, engagementService, handleSyncEvent, refreshCommands, user?.workspaceId]);

  const triggerSync = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    if (!syncEngineInstance || !user?.workspaceId) {
      return;
    }
    if (!isOnline && autoSyncEnabled) {
      return;
    }

    setSyncStatus("syncing");
    try {
      const stats = await syncEngineInstance.flush(user.workspaceId);
      setLastSyncAt(new Date());
      setLastSyncStats(stats);
      await refreshCommands();
      await log("INFO", "Manual sync completed", { workspaceId: user.workspaceId, stats });
    } catch (error) {
      await log("ERROR", "Sync failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("Sync failed:", error);
    } finally {
      setSyncStatus("idle");
    }
  }, [autoSyncEnabled, isOnline, log, refreshCommands, user?.workspaceId]);

  useEffect(() => {
    if (!apiClient) {
      return;
    }
    void initializeSync();
  }, [apiClient, initializeSync]);

  useEffect(() => {
    if (!autoSyncEnabled || !isOnline || !user?.workspaceId) {
      return;
    }
    void triggerSync();
  }, [autoSyncEnabled, isOnline, triggerSync, user?.workspaceId]);

  const retryFailedCommand = useCallback(
    async (commandId: string) => {
      if (Platform.OS === "web") {
        return;
      }
      if (!outboxStoreInstance) {
        return;
      }
      await outboxStoreInstance.resetToPending(commandId);
      await log("INFO", "Command reset to pending", { commandId });
      await triggerSync();
    },
    [log, triggerSync]
  );

  const retryFailedCommands = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    if (!outboxStoreInstance || !user?.workspaceId) {
      return;
    }
    const failed = commands.filter((command) => command.status === "FAILED");
    for (const command of failed) {
      await outboxStoreInstance.resetToPending(command.commandId);
    }
    await log("INFO", "Bulk retry requested", { count: failed.length });
    await triggerSync();
  }, [commands, log, triggerSync, user?.workspaceId]);

  const dropCommand = useCallback(
    async (commandId: string) => {
      if (Platform.OS === "web") {
        return;
      }
      const db = await getPosDatabase();
      await db.runAsync(`DELETE FROM outbox_commands WHERE commandId = ?`, [commandId]);
      await log("WARN", "Command dropped from outbox", { commandId });
      await refreshCommands();
    },
    [log, refreshCommands]
  );

  const exportLogsToClipboard = useCallback(async () => {
    if (Platform.OS === "web") {
      return 0;
    }
    const db = await getPosDatabase();
    const payload = await exportSyncLogs(db, user?.workspaceId ?? null);
    await Clipboard.setStringAsync(payload);
    return payload.length;
  }, [user?.workspaceId]);

  const queueStats = useMemo(
    () => ({
      total: commands.length,
      pending: commands.filter((command) => command.status === "PENDING").length,
      failed: commands.filter((command) => command.status === "FAILED").length,
      conflicts: commands.filter((command) => command.status === "CONFLICT").length,
      succeeded: commands.filter((command) => command.status === "SUCCEEDED").length,
      inFlight: commands.filter((command) => command.status === "IN_FLIGHT").length,
    }),
    [commands]
  );

  const toggleAutoSync = () => setAutoSyncEnabled((value) => !value);

  return {
    commands,
    pendingCommands: commands,
    queueStats,
    syncStatus,
    isOnline,
    autoSyncEnabled,
    lastSyncAt,
    lastSyncStats,
    isReady,
    initializeSync,
    triggerSync,
    refreshCommands,
    retryFailedCommand,
    retryFailedCommands,
    dropCommand,
    toggleAutoSync,
    exportLogsToClipboard,
  };
}
