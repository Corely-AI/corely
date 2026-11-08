import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { SessionClient, SessionRequestError, type SessionSurfaceConfig } from "./session-client";
import {
  SessionContext,
  type BrowserSessionContext,
  type BrowserSessionState,
} from "./session-context";
import { retireLegacyStorage } from "./retire-legacy-storage";
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
  const loggingOut = useRef(false);
  const logoutRequired = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const currentUser = useRef<string | null>(null);
  const mounted = useRef(false);
  const clearCache = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);
  const retry = useCallback(async () => {
    const attempt = ++sequence.current;
    currentUser.current = null;
    client.dispose();
    setState({ status: "booting" });
    await clearCache();
    if (!mounted.current || attempt !== sequence.current) {
      return;
    }
    try {
      if (config.retireLegacyStorage && !(await retireLegacyStorage())) {
        if (mounted.current && attempt === sequence.current) {
          setState({ status: "migrationBlocked" });
        }
        return;
      }
      if (!mounted.current || attempt !== sequence.current) {
        return;
      }
      const session = await client.bootstrap();
      if (mounted.current && attempt === sequence.current) {
        currentUser.current = session.user.userId;
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
  }, [client, clearCache, config.retireLegacyStorage]);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = client.onFailure((status) => {
      if (mounted.current) {
        sequence.current++;
        currentUser.current = null;
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
  useEffect(() => {
    // Same-origin hints only invalidate UI; server checks remain the authority across origins.
    const invalidate = () => {
      sequence.current++;
      currentUser.current = null;
      client.dispose();
      setState({ status: "unauthenticated" });
      void clearCache();
    };
    if (typeof BroadcastChannel !== "undefined") {
      const connection = new BroadcastChannel("corely-session-invalidation");
      channel.current = connection;
      connection.onmessage = invalidate;
    }
    const check = () => {
      if (!logoutRequired.current) {
        void retry();
      }
    };
    const visibility = () => {
      if (logoutRequired.current) {
        return;
      }
      if (document.visibilityState === "hidden") {
        sequence.current++;
        client.dispose();
        setState({ status: "booting" });
        void clearCache();
      } else {
        check();
      }
    };
    const suspend = () => {
      sequence.current++;
      client.dispose();
      // Remove readable DOM before a history snapshot can freeze this document.
      flushSync(() => setState({ status: logoutRequired.current ? "logoutFailed" : "booting" }));
      void clearCache();
    };
    const restore = () => check();
    window.addEventListener("pagehide", suspend);
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", restore);
    document.addEventListener("visibilitychange", visibility);
    // Recheck active idle tabs without periodically unmounting forms. Any changed
    // identity or failed verification clears state before protected content returns.
    const timer = window.setInterval(async () => {
      if (logoutRequired.current || document.visibilityState === "hidden" || !currentUser.current) {
        return;
      }
      const attempt = sequence.current;
      const deadline = window.setTimeout(() => {
        if (mounted.current && attempt === sequence.current) {
          sequence.current++;
          currentUser.current = null;
          client.dispose();
          setState({ status: "unavailable" });
          void clearCache();
        }
      }, 10_000);
      try {
        const session = await client.bootstrap();
        if (!mounted.current || attempt !== sequence.current) {
          return;
        }
        if (currentUser.current !== session.user.userId) {
          setState({ status: "booting" });
          await clearCache();
        }
        if (mounted.current && attempt === sequence.current) {
          currentUser.current = session.user.userId;
          setState({ status: "authenticated", session });
        }
      } catch {
        /* The client's failure event closes the boundary. */
      } finally {
        window.clearTimeout(deadline);
      }
    }, 30_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", restore);
      document.removeEventListener("visibilitychange", visibility);
      channel.current?.close();
      channel.current = null;
    };
  }, [client, clearCache, retry]);
  const logout = useCallback(async () => {
    if (loggingOut.current) {
      return;
    }
    loggingOut.current = true;
    logoutRequired.current = true;
    const attempt = ++sequence.current;
    currentUser.current = null;
    setState({ status: "signingOut" });
    // logout() captures the proof and aborts old reads synchronously.
    const result = client.logout();
    channel.current?.postMessage("invalidate");
    try {
      await Promise.all([result, clearCache()]);
      logoutRequired.current = false;
      if (mounted.current && attempt === sequence.current) {
        setState({ status: "unauthenticated" });
      }
    } catch {
      if (mounted.current) {
        setState({ status: "logoutFailed" });
      }
    } finally {
      loggingOut.current = false;
    }
  }, [client, clearCache]);
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
    () => ({ state, client, retry, login, refresh, logout }),
    [state, client, retry, login, refresh, logout]
  );
  return (
    <SessionContext.Provider value={value}>
      {state.status === "authenticated" ? (
        <React.Fragment key={state.session.user.userId}>{children}</React.Fragment>
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
