import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { WorkspaceDto } from "@corely/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "./workspaces-api";
import { getActiveWorkspaceId, setActiveWorkspaceId, subscribeWorkspace } from "./workspace-store";
import { useAuth } from "@/lib/auth-provider";

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
  const { isAuthenticated, user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(getActiveWorkspaceId());
  const isHostScope = user?.activeTenantId === null;

  console.debug("[WorkspaceProvider] init", {
    isAuthenticated,
    initialActiveId: activeId,
  });

  const {
    data: workspaces = [],
    isFetching,
    refetch,
  } = useQuery<WorkspaceDto[]>({
    queryKey: ["workspaces"],
    queryFn: () => workspacesApi.listWorkspaces(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // keep local and persisted workspace id in sync
  useEffect(() => {
    return subscribeWorkspace((id) => setActiveId(id));
  }, []);

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

  // Set default workspace once we have list
  useEffect(() => {
    console.debug("[WorkspaceProvider] evaluate default workspace", {
      activeId,
      workspaces: workspaces.length,
      isFetching,
    });

    if (!activeId && workspaces.length > 0 && !isHostScope) {
      console.debug("[WorkspaceProvider] setting default workspace", {
        id: workspaces[0].id,
        name: workspaces[0].name,
      });
      const defaultId = workspaces[0].id;
      setActiveWorkspaceId(defaultId);
      setActiveId(defaultId);
    }
  }, [activeId, workspaces, isHostScope]);

  // If stored activeId does not exist in fetched workspaces, fall back to first
  useEffect(() => {
    if (activeId && workspaces.length > 0 && !isHostScope) {
      const exists = workspaces.some((w) => w.id === activeId);
      if (!exists) {
        const fallbackId = workspaces[0].id;
        console.debug("[WorkspaceProvider] activeId not found, resetting to first workspace", {
          staleActiveId: activeId,
          fallbackId,
        });
        setActiveWorkspaceId(fallbackId);
        setActiveId(fallbackId);
      }
    }
  }, [activeId, workspaces, isHostScope]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [activeId, workspaces]
  );

  const setWorkspace = (workspaceId: string) => {
    const previousWorkspaceId = activeId;
    setActiveWorkspaceId(workspaceId);
    setActiveId(workspaceId);
    console.debug("[WorkspaceProvider] workspace switched", {
      from: previousWorkspaceId,
      to: workspaceId,
    });

    // CRITICAL: Invalidate ALL queries when switching workspaces
    // This prevents data from the previous workspace from appearing
    // in the new workspace context. The queries will refetch with
    // the new workspaceId header.
    void queryClient.invalidateQueries();
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

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
};
