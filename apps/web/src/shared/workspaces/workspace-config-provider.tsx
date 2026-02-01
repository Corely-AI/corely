import React, { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  WorkspaceCapabilityKey,
  WorkspaceConfig,
  WorkspaceNavigationGroup,
} from "@corely/contracts";
import { filterNavigationGroups } from "./navigation";
import { useWorkspace } from "./workspace-provider";
import { workspacesApi } from "./workspaces-api";
import { useAuth } from "@/lib/auth-provider";

interface WorkspaceConfigContextValue {
  config: WorkspaceConfig | null;
  isLoading: boolean;
  error: Error | null;
  hasCapability: (capability: WorkspaceCapabilityKey) => boolean;
  can: (capability: WorkspaceCapabilityKey) => boolean;
  refresh: () => Promise<void>;
  navigationGroups: WorkspaceNavigationGroup[];
}

const WorkspaceConfigContext = createContext<WorkspaceConfigContextValue | undefined>(undefined);

export const WorkspaceConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { activeWorkspaceId, workspaces, isLoading: isWorkspacesLoading } = useWorkspace();
  const { isAuthenticated } = useAuth();
  const hasValidWorkspace =
    !!activeWorkspaceId && workspaces.some((w) => w.id === activeWorkspaceId);
  const enabled = isAuthenticated && hasValidWorkspace && !isWorkspacesLoading;

  const {
    data: config,
    isFetching,
    error,
    refetch,
  } = useQuery<WorkspaceConfig, Error>({
    queryKey: ["workspace-config", activeWorkspaceId],
    queryFn: () => {
      // Debug to verify which workspaceId is being used for config fetch
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("[WorkspaceConfigProvider] fetching config", {
          activeWorkspaceId,
          workspacesCount: workspaces.length,
          hasValidWorkspace,
        });
      }
      return workspacesApi.getWorkspaceConfig(activeWorkspaceId as string, {
        scope: "web",
      });
    },
    enabled,
    staleTime: 60_000,
  });

  const hasCapability = (capability: WorkspaceCapabilityKey) =>
    Boolean(config?.capabilities?.[capability]);

  const navigationGroups = React.useMemo(() => {
    if (!config) {
      return [];
    }
    return filterNavigationGroups(config.navigation.groups, config.capabilities);
  }, [config]);

  const value: WorkspaceConfigContextValue = {
    config: config ?? null,
    isLoading: isFetching,
    error: error ?? null,
    hasCapability,
    can: hasCapability,
    refresh: async () => {
      if (activeWorkspaceId) {
        await queryClient.invalidateQueries({ queryKey: ["workspace-config", activeWorkspaceId] });
      }
    },
    navigationGroups,
  };

  return (
    <WorkspaceConfigContext.Provider value={value}>{children}</WorkspaceConfigContext.Provider>
  );
};

export const useWorkspaceConfig = (): WorkspaceConfigContextValue => {
  const ctx = useContext(WorkspaceConfigContext);
  if (!ctx) {
    throw new Error("useWorkspaceConfig must be used within WorkspaceConfigProvider");
  }
  return ctx;
};
