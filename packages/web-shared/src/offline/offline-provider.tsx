import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import {
  LocalStorageSyncLock,
  IndexedDbOutboxStore,
  WebNetworkMonitor,
  createIndexedDbPersister,
} from "@corely/offline-web";
import {
  type Clock,
  type IdGenerator,
  type Logger,
  SyncEngine,
  type SyncTransport,
} from "@corely/offline-core";
import { computeBackoffDelayMs, defaultRetryPolicy } from "@corely/api-client";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { getActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";
import { scopePersister } from "./scope-persister";

interface OfflineContextValue {
  syncEngine: SyncEngine | null;
}

const OfflineContext = createContext<OfflineContextValue>({ syncEngine: null });

const defaultClock: Clock = { now: () => new Date() };
const defaultIdGenerator: IdGenerator = {
  newId: () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
};
const consoleLogger: Logger = {
  debug: (message, meta) => console.debug(`[offline] ${message}`, meta),
  info: (message, meta) => console.info(`[offline] ${message}`, meta),
  warn: (message, meta) => console.warn(`[offline] ${message}`, meta),
  error: (message, meta) => console.error(`[offline] ${message}`, meta),
};

const placeholderTransport: SyncTransport = {
  async executeCommand() {
    // Placeholder transport until commands are wired to backend endpoints.
    return { status: "FATAL_ERROR", error: "Sync transport not configured" };
  },
};

interface OfflineProviderProps {
  queryClient: QueryClient;
  children: React.ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ queryClient, children }) => {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const persisterKey = useMemo(
    () => `corely-cache:${user?.userId ?? "anon"}:${activeWorkspaceId ?? "workspace"}`,
    [user?.userId, activeWorkspaceId]
  );
  const currentPersisterKey = useRef(persisterKey);
  currentPersisterKey.current = persisterKey;

  const syncEngineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (!syncEngineRef.current) {
      const store = new IndexedDbOutboxStore();
      const lock = new LocalStorageSyncLock();
      const networkMonitor = new WebNetworkMonitor();
      syncEngineRef.current = new SyncEngine(
        {
          store,
          lock,
          transport: placeholderTransport,
          networkMonitor,
          clock: defaultClock,
          idGenerator: defaultIdGenerator,
          logger: consoleLogger,
        },
        {
          flushIntervalMs: 30000,
          batchSize: 20,
        }
      );
      syncEngineRef.current.start();
    }
  }, []);

  useEffect(() => {
    if (activeWorkspaceId && syncEngineRef.current) {
      syncEngineRef.current.trackWorkspace(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    let mounted = true;
    const persister = scopePersister(
      createIndexedDbPersister({ key: persisterKey }),
      () =>
        mounted &&
        currentPersisterKey.current === persisterKey &&
        getActiveWorkspaceId() === activeWorkspaceId
    );
    const [unsubscribe, restorePromise] = persistQueryClient({
      queryClient,
      persister,
      // Drop snapshots written before workspace transitions were isolated.
      buster: "workspace-scope-v2",
      dehydrateOptions: {
        shouldDehydrateQuery: (query) =>
          query.state.status === "success" && query.queryKey[0] !== "permissions",
      },
    });
    restorePromise.catch((err) => consoleLogger.warn("Failed to restore query cache", err));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [persisterKey, queryClient, activeWorkspaceId]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      syncEngine: syncEngineRef.current,
    }),
    []
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextValue => useContext(OfflineContext);

export const withOffline = (Component: React.ComponentType): React.FC => {
  return function OfflineWrapper(props) {
    const queryClient = useMemo(
      () =>
        new QueryClient({
          defaultOptions: {
            queries: {
              retry: 2,
              retryDelay: (attempt) => computeBackoffDelayMs(attempt, defaultRetryPolicy),
            },
          },
        }),
      []
    );
    return (
      <QueryClientProvider client={queryClient}>
        <OfflineProvider queryClient={queryClient}>
          <Component {...props} />
        </OfflineProvider>
      </QueryClientProvider>
    );
  };
};
