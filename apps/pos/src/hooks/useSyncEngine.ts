import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import * as Clipboard from "expo-clipboard";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { Platform } from "react-native";
import {
  SyncEngine,
  type FlushStats,
  type OutboxCommand,
  type SyncEngineEvent,
} from "@corely/offline-core";
import { ReactNativeNetworkMonitor } from "@corely/offline-rn";
import { useAuthStore } from "@/stores/authStore";
import { InMemorySyncLock } from "@/lib/offline/syncLock";
import { PosSyncTransport } from "@/lib/offline/posSyncTransport";
import { useEngagementService } from "@/hooks/useEngagementService";
import { appendSyncLog, exportSyncLogs, getPosDatabase, writeSyncState } from "@/lib/pos-db";
import { getPosLocalService } from "@/hooks/usePosLocalService";
import { getOutboxStore } from "@/lib/offline/outboxStore";
import {
  appendSyncLogWeb,
  exportSyncLogsWeb,
  type PosOutboxStore,
  writeSyncStateWeb,
} from "@/lib/offline/webOutboxStore";

let syncEngineInstance: SyncEngine | null = null;
let outboxStoreInstance: PosOutboxStore | null = null;
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
      const workspaceId = useAuthStore.getState().user?.workspaceId ?? null;
      if (Platform.OS === "web") {
        await appendSyncLogWeb({
          workspaceId,
          level,
          message,
          meta,
        });
        return;
      }

      const db = await getPosDatabase();
      await appendSyncLog(db, {
        workspaceId,
        level,
        message,
        meta,
      });
    },
    []
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  const refreshCommands = useCallback(async () => {
    const workspaceId = useAuthStore.getState().user?.workspaceId;
    if (!outboxStoreInstance || !workspaceId) {
      return;
    }

    try {
      const next = await outboxStoreInstance.findByWorkspace(workspaceId);
      setCommands(next);
    } catch (error) {
      console.error("Failed to refresh outbox commands:", error);
    }
  }, []);

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
        if (Platform.OS === "web") {
          await writeSyncStateWeb("sync:last_sync_at", new Date().toISOString());
          await writeSyncStateWeb("sync:last_stats", JSON.stringify(event.stats));
        } else {
          await writeSyncState(
            await getPosDatabase(),
            "sync:last_sync_at",
            new Date().toISOString()
          );
          await writeSyncState(
            await getPosDatabase(),
            "sync:last_stats",
            JSON.stringify(event.stats)
          );
        }
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

  const ensureSyncEngine = useCallback(async () => {
    const authState = useAuthStore.getState();
    const currentApiClient = authState.apiClient;
    const workspaceId = authState.user?.workspaceId;
    if (!currentApiClient) {
      return null;
    }

    if (!outboxStoreInstance) {
      outboxStoreInstance = await getOutboxStore();
    }

    if (!syncEngineInstance) {
      const lock = new InMemorySyncLock();
      const networkMonitor = new ReactNativeNetworkMonitor(NetInfo as never);
      const posLocalService = await getPosLocalService();
      const transport = new PosSyncTransport({
        apiClient: currentApiClient,
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

    if (workspaceId) {
      syncEngineInstance.trackWorkspace(workspaceId);
    }

    if (!syncSubscription) {
      syncSubscription = syncEngineInstance.subscribe((event: SyncEngineEvent) => {
        void handleSyncEvent(event);
      });
    }

    await refreshCommands();
    setIsReady(true);
    return syncEngineInstance;
  }, [engagementService, handleSyncEvent, refreshCommands]);

  const initializeSync = useCallback(async () => {
    const authState = useAuthStore.getState();
    if (!authState.apiClient || isInitializingRef.current) {
      return;
    }
    isInitializingRef.current = true;
    try {
      await ensureSyncEngine();
    } finally {
      isInitializingRef.current = false;
    }
  }, [ensureSyncEngine]);

  const triggerSync = useCallback(async () => {
    const workspaceId = useAuthStore.getState().user?.workspaceId;
    const attemptedAt = new Date();
    const engine = await ensureSyncEngine();
    if (!engine || !workspaceId) {
      setLastSyncAt(attemptedAt);
      setLastSyncStats({
        processed: 0,
        succeeded: 0,
        failed: 0,
        conflicts: 0,
        retried: 0,
      });
      await refreshCommands();
      await log("WARN", "Manual sync requested before sync engine was ready", {
        hasEngine: Boolean(engine),
        hasWorkspaceId: Boolean(workspaceId),
      });
      return;
    }
    if (!isOnline && autoSyncEnabled) {
      setLastSyncAt(attemptedAt);
      await log("WARN", "Manual sync skipped while offline", {
        workspaceId,
      });
      return;
    }

    setSyncStatus("syncing");
    try {
      const stats = await engine.flush(workspaceId);
      setLastSyncAt(attemptedAt);
      setLastSyncStats(stats);
      await refreshCommands();
      await log("INFO", "Manual sync completed", { workspaceId, stats });
    } catch (error) {
      await log("ERROR", "Sync failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("Sync failed:", error);
    } finally {
      setSyncStatus("idle");
    }
  }, [autoSyncEnabled, ensureSyncEngine, isOnline, log, refreshCommands]);

  useEffect(() => {
    if (!useAuthStore.getState().apiClient) {
      return;
    }
    void initializeSync();
  }, [apiClient, initializeSync]);

  useEffect(() => {
    const workspaceId = useAuthStore.getState().user?.workspaceId;
    if (!autoSyncEnabled || !isOnline || !workspaceId) {
      return;
    }
    void triggerSync();
  }, [autoSyncEnabled, isOnline, triggerSync, user?.workspaceId]);

  const retryFailedCommand = useCallback(
    async (commandId: string) => {
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
    if (!outboxStoreInstance || !useAuthStore.getState().user?.workspaceId) {
      return;
    }
    const failed = commands.filter((command) => command.status === "FAILED");
    for (const command of failed) {
      await outboxStoreInstance.resetToPending(command.commandId);
    }
    await log("INFO", "Bulk retry requested", { count: failed.length });
    await triggerSync();
  }, [commands, log, triggerSync]);

  const dropCommand = useCallback(
    async (commandId: string) => {
      if (Platform.OS === "web") {
        if (!outboxStoreInstance) {
          outboxStoreInstance = await getOutboxStore();
        }
        await outboxStoreInstance.deleteById?.(commandId);
      } else {
        const db = await getPosDatabase();
        await db.runAsync(`DELETE FROM outbox_commands WHERE commandId = ?`, [commandId]);
      }
      await log("WARN", "Command dropped from outbox", { commandId });
      await refreshCommands();
    },
    [log, refreshCommands]
  );

  const exportLogsToClipboard = useCallback(async () => {
    const workspaceId = useAuthStore.getState().user?.workspaceId ?? null;
    const payload =
      Platform.OS === "web"
        ? await exportSyncLogsWeb(workspaceId)
        : await exportSyncLogs(await getPosDatabase(), workspaceId);
    await Clipboard.setStringAsync(payload);
    return payload.length;
  }, []);

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
