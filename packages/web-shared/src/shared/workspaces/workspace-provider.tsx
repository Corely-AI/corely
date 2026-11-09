import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WorkspaceDto } from "@corely/contracts";
import { useQuery, useQueryClient, type Query } from "@tanstack/react-query";
import { workspacesApi } from "./workspaces-api";
import { getActiveWorkspaceId, setActiveWorkspaceId, subscribeWorkspace } from "./workspace-store";
import { useAuth } from "@corely/web-shared/lib/auth-provider";

interface WorkspaceContextValue {
  workspaces: WorkspaceDto[];
  activeWorkspace: WorkspaceDto | null;
  activeWorkspaceId: string | null;
  isLoading: boolean;
  isHostScope: boolean;
  setWorkspace: (workspaceId: string) => void;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(getActiveWorkspaceId());
  const activeIdRef = useRef(activeId);
  const isHostScope = user?.activeTenantId === null;
  const shouldLoadWorkspaces = isAuthenticated && !isAuthLoading && !isHostScope;

  console.debug("[WorkspaceProvider] init", {
    isAuthenticated,
    initialActiveId: activeId,
  });

  const {
    data: workspaces = [],
    isFetching,
    isSuccess,
    refetch,
  } = useQuery<WorkspaceDto[]>({
    queryKey: ["workspaces", user?.activeTenantId],
    queryFn: () => workspacesApi.listWorkspaces(),
    enabled: shouldLoadWorkspaces,
    staleTime: 30_000,
  });

  const adoptWorkspace = useCallback(
    (id: string | null) => {
      if (activeIdRef.current === id) {
        return;
      }
      activeIdRef.current = id;
      // Invalidation retains old payloads while fetching. Discard them at the scope boundary.
      const oldPayloads = {
        predicate: (query: Query) =>
          !(query.queryKey[0] === "workspaces" && query.queryKey[1] === user?.activeTenantId),
      };
      void queryClient.cancelQueries(oldPayloads);
      queryClient.removeQueries(oldPayloads);
      queryClient.getMutationCache().clear();
      setActiveId(id);
    },
    [queryClient, user?.activeTenantId]
  );

  // Also cover bootstrap repairs and external changes through the shared store.
  useEffect(() => {
    return subscribeWorkspace(adoptWorkspace);
  }, [adoptWorkspace]);

  // Log when workspaces are fetched
  useEffect(() => {
    if (workspaces.length > 0) {
      console.debug("[WorkspaceProvider] workspaces fetched", {
        count: workspaces.length,
        enabled: isAuthenticated,
        activeId,
      });
    }
  }, [workspaces, isAuthenticated, activeId]);

  // Only an authoritative completed discovery can replace or clear a saved selection.
  useEffect(() => {
    if (!shouldLoadWorkspaces || isFetching || !isSuccess) {
      return;
    }
    if (!workspaces.some((workspace) => workspace.id === activeId)) {
      const fallbackId = workspaces[0]?.id ?? null;
      if (fallbackId !== activeId) {
        setActiveWorkspaceId(fallbackId);
        adoptWorkspace(fallbackId);
      }
    }
  }, [activeId, workspaces, shouldLoadWorkspaces, isFetching, isSuccess, adoptWorkspace]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [activeId, workspaces]
  );

  const setWorkspace = (workspaceId: string) => {
    const previousWorkspaceId = activeId;
    setActiveWorkspaceId(workspaceId);
    adoptWorkspace(workspaceId);
    console.debug("[WorkspaceProvider] workspace switched", {
      from: previousWorkspaceId,
      to: workspaceId,
    });
  };

  const value: WorkspaceContextValue = {
    workspaces,
    activeWorkspace,
    activeWorkspaceId: activeId,
    isLoading: isFetching,
    isHostScope,
    setWorkspace,
    refresh: async () => {
      await refetch();
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useOptionalWorkspace = () => useContext(WorkspaceContext);
export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
};
