import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { WorkspaceDto } from "@corely/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "./workspaces-api";
import { getActiveWorkspaceId, setActiveWorkspaceId, subscribeWorkspace } from "./workspace-store";
import { useAuth } from "@/lib/auth-provider";
import { features } from "@/lib/features";

interface WorkspaceContextValue {
  workspaces: WorkspaceDto[];
  activeWorkspace: WorkspaceDto | null;
  activeWorkspaceId: string | null;
  isLoading: boolean;
  setWorkspace: (workspaceId: string) => void;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(getActiveWorkspaceId());

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
    enabled: isAuthenticated && features.multiTenant,
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

  // Set default workspace once we have list (EE) or fallback default (OSS)
  useEffect(() => {
    console.debug("[WorkspaceProvider] evaluate default workspace", {
      activeId,
      workspaces: workspaces.length,
      isFetching,
      multiTenant: features.multiTenant,
    });

    if (!activeId) {
      if (features.multiTenant && workspaces.length > 0) {
        const defaultId = workspaces[0].id;
        setActiveWorkspaceId(defaultId);
        setActiveId(defaultId);
      }
      if (!features.multiTenant) {
        const defaultId = features.defaultWorkspaceId;
        setActiveWorkspaceId(defaultId);
        setActiveId(defaultId);
      }
    }
  }, [activeId, workspaces]);

  // If stored activeId does not exist in fetched workspaces, fall back to first
  useEffect(() => {
    if (activeId && workspaces.length > 0) {
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
  }, [activeId, workspaces]);

  const defaultOssWorkspace: WorkspaceDto | null = !features.multiTenant
    ? {
        id: activeId ?? features.defaultWorkspaceId,
        name: "Default Workspace",
        kind: "PERSONAL",
      }
    : null;

  const effectiveWorkspaces = features.multiTenant
    ? workspaces
    : defaultOssWorkspace
      ? [defaultOssWorkspace]
      : [];

  const activeWorkspace = useMemo(() => {
    if (!features.multiTenant) {
      return defaultOssWorkspace;
    }
    return workspaces.find((w) => w.id === activeId) ?? null;
  }, [activeId, workspaces, defaultOssWorkspace]);

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
    workspaces: effectiveWorkspaces,
    activeWorkspace,
    activeWorkspaceId: activeId,
    isLoading: isFetching,
    setWorkspace,
    refresh: async () => {
      if (features.multiTenant) {
        await refetch();
      }
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
