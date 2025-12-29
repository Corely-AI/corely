import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { SyncEngine } from '@kerniflow/offline-core';
import { SqliteOutboxStore } from '@kerniflow/offline-rn';
import * as SQLite from 'expo-sqlite';
import type { OutboxCommand } from '@kerniflow/offline-core';

let syncEngineInstance: SyncEngine | null = null;
let outboxStoreInstance: SqliteOutboxStore | null = null;

export function useSyncEngine() {
  const [pendingCommands, setPendingCommands] = useState<OutboxCommand[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing'>('idle');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const initializeSync = async () => {
    if (!outboxStoreInstance) {
      const db = await SQLite.openDatabaseAsync('kerniflow-pos.db');
      outboxStoreInstance = new SqliteOutboxStore(db as any);
      await outboxStoreInstance.initialize();
    }

    if (!syncEngineInstance) {
      syncEngineInstance = new SyncEngine(outboxStoreInstance, {
        apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
        getAccessToken: async () => {
          // TODO: Get token from auth store
          return '';
        },
      });
    }

    // Load pending commands
    await refreshPendingCommands();
  };

  const refreshPendingCommands = async () => {
    if (!outboxStoreInstance) return;

    // TODO: Implement findPending in outbox store
    // const commands = await outboxStoreInstance.findPending('workspace-id', 100);
    // setPendingCommands(commands);
  };

  const triggerSync = async () => {
    if (!syncEngineInstance || !isOnline) return;

    setSyncStatus('syncing');
    try {
      await syncEngineInstance.processQueue('workspace-id');
      await refreshPendingCommands();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncStatus('idle');
    }
  };

  const retryFailedCommand = async (commandId: string) => {
    if (!outboxStoreInstance) return;

    // TODO: Implement retry logic
    // Reset command status to PENDING and trigger sync
    await triggerSync();
  };

  return {
    pendingCommands,
    syncStatus,
    isOnline,
    initializeSync,
    triggerSync,
    retryFailedCommand,
  };
}
