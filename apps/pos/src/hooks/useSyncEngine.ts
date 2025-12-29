import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { SyncEngine } from '@kerniflow/offline-core';
import { SqliteOutboxStore } from '@kerniflow/offline-rn';
import * as SQLite from 'expo-sqlite';
import type { OutboxCommand } from '@kerniflow/offline-core';
import { useAuthStore } from '@/stores/authStore';

let syncEngineInstance: SyncEngine | null = null;
let outboxStoreInstance: SqliteOutboxStore | null = null;

export function useSyncEngine() {
  const [pendingCommands, setPendingCommands] = useState<OutboxCommand[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing'>('idle');
  const [isOnline, setIsOnline] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const previousOnlineState = useRef(false);
  const { authClient, user } = useAuthStore();

  // Monitor network connectivity and auto-sync when coming back online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nowOnline = state.isConnected ?? false;
      setIsOnline(nowOnline);

      // Trigger sync when transitioning from offline to online
      if (autoSyncEnabled && !previousOnlineState.current && nowOnline) {
        console.log('Network restored, triggering auto-sync...');
        triggerSync();
      }

      previousOnlineState.current = nowOnline;
    });

    return () => {
      unsubscribe();
    };
  }, [autoSyncEnabled]);

  const initializeSync = async () => {
    if (!outboxStoreInstance) {
      const db = await SQLite.openDatabaseAsync('kerniflow-pos.db');
      outboxStoreInstance = new SqliteOutboxStore(db as any);
      await outboxStoreInstance.initialize();
    }

    if (!syncEngineInstance && authClient) {
      syncEngineInstance = new SyncEngine(outboxStoreInstance, {
        apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
        getAccessToken: async () => {
          return authClient.getAccessToken() ?? '';
        },
      });
    }

    // Load pending commands
    await refreshPendingCommands();
  };

  const refreshPendingCommands = async () => {
    if (!outboxStoreInstance || !user) return;

    try {
      // Get pending commands from outbox
      const commands = await outboxStoreInstance.findPending(user.workspaceId, 100);
      setPendingCommands(commands);
    } catch (error) {
      console.error('Failed to refresh pending commands:', error);
    }
  };

  const triggerSync = async () => {
    if (!syncEngineInstance || !isOnline || !user) {
      console.log('Skipping sync:', {
        hasEngine: !!syncEngineInstance,
        isOnline,
        hasUser: !!user
      });
      return;
    }

    setSyncStatus('syncing');
    try {
      await syncEngineInstance.processQueue(user.workspaceId);
      await refreshPendingCommands();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncStatus('idle');
    }
  };

  const retryFailedCommand = async (commandId: string) => {
    if (!outboxStoreInstance) return;

    try {
      // Reset command status to PENDING
      await outboxStoreInstance.markForRetry(commandId);
      // Trigger sync
      await triggerSync();
    } catch (error) {
      console.error('Failed to retry command:', error);
    }
  };

  const toggleAutoSync = () => {
    setAutoSyncEnabled((prev: boolean) => !prev);
  };

  return {
    pendingCommands,
    syncStatus,
    isOnline,
    autoSyncEnabled,
    initializeSync,
    triggerSync,
    retryFailedCommand,
    toggleAutoSync,
  };
}
