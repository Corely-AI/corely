import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { SessionClient, SessionRequestError, type SessionSurfaceConfig } from "./session-client";
import {
  SessionContext,
  type BrowserSessionContext,
  type BrowserSessionState,
} from "./session-context";
import { SessionStatus } from "./session-status";

export interface SessionProvidersProps {
  config: SessionSurfaceConfig;
  children: React.ReactNode;
  fetchFn?: typeof fetch;
  navigate?: (url: string) => void;
  fallback?: (value: BrowserSessionContext) => React.ReactNode;
}
function SessionProvider({ config, children, fetchFn, navigate, fallback }: SessionProvidersProps) {
  const queryClient = useQueryClient();
  const client = useMemo(
    () => new SessionClient(config, fetchFn),
    [config.appKey, config.tenantId, config.workspaceId, fetchFn]
  );
  const [state, setState] = useState<BrowserSessionState>({ status: "booting" });
  const sequence = useRef(0);
  const mounted = useRef(false);
  const clearCache = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);
  const retry = useCallback(async () => {
    const attempt = ++sequence.current;
    setState({ status: "booting" });
    await clearCache();
    if (!mounted.current || attempt !== sequence.current) {
      return;
    }
    try {
      const session = await client.bootstrap();
      if (mounted.current && attempt === sequence.current) {
        setState({ status: "authenticated", session });
      }
    } catch (error) {
      if (mounted.current && attempt === sequence.current) {
        setState({
          status:
            error instanceof SessionRequestError && error.kind !== "request"
              ? error.kind
              : "unavailable",
        });
      }
    }
  }, [client, clearCache]);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = client.onFailure((status) => {
      if (mounted.current) {
        setState({ status });
        void clearCache();
      }
    });
    void retry();
    return () => {
      mounted.current = false;
      sequence.current++;
      unsubscribe();
      client.dispose();
      void clearCache();
    };
  }, [client, retry, clearCache]);
  const login = useCallback(
    async (returnPath?: string) => {
      try {
        const destination =
          returnPath ??
          `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const url = await client.startLogin(destination);
        (navigate ?? ((target: string) => window.location.assign(target)))(url);
      } catch {
        if (mounted.current) {
          setState({ status: "unavailable" });
        }
      }
    },
    [client, navigate]
  );
  const refresh = useCallback(async () => {
    try {
      await client.rotate();
      await retry();
    } catch (error) {
      if (mounted.current) {
        setState({
          status:
            error instanceof SessionRequestError && error.kind !== "request"
              ? error.kind
              : "unavailable",
        });
        await clearCache();
      }
    }
  }, [client, retry, clearCache]);
  const value = useMemo<BrowserSessionContext>(
    () => ({ state, client, retry, login, refresh }),
    [state, client, retry, login, refresh]
  );
  return (
    <SessionContext.Provider value={value}>
      {state.status === "authenticated" ? (
        children
      ) : fallback ? (
        fallback(value)
      ) : (
        <SessionStatus value={value} locale={config.locale} />
      )}
    </SessionContext.Provider>
  );
}

/** New surfaces explicitly choose this stack. Legacy Providers and token clients stay intact. */
export function SessionProviders(props: SessionProvidersProps) {
  const scope = `${props.config.appKey}:${props.config.tenantId ?? ""}:${props.config.workspaceId ?? ""}`;
  // A new scope starts empty; it never hydrates legacy/offline readable caches.
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
    [scope]
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider key={scope} {...props} />
    </QueryClientProvider>
  );
}
