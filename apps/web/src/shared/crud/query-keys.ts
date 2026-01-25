import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

/**
 * Creates workspace-scoped query keys for a resource.
 * All keys include the active workspaceId to ensure proper cache isolation.
 */
export const createCrudQueryKeys = (resource: string) => {
  return {
    /**
     * Base key for all queries of this resource (includes workspace)
     */
    all: (workspaceId?: string | null) => {
      const wsId = workspaceId ?? getActiveWorkspaceId();
      return wsId ? ([resource, { workspaceId: wsId }] as QueryKey) : ([resource] as QueryKey);
    },
    /**
     * Key for list queries - includes workspace and optional params
     */
    list: (params?: unknown, workspaceId?: string | null) => {
      const wsId = workspaceId ?? getActiveWorkspaceId();
      return wsId
        ? ([resource, "list", { workspaceId: wsId, ...((params as object) ?? {}) }] as QueryKey)
        : ([resource, "list", params ?? {}] as QueryKey);
    },
    /**
     * Key for detail queries - includes workspace and item id
     */
    detail: (id: string | undefined, workspaceId?: string | null) => {
      const wsId = workspaceId ?? getActiveWorkspaceId();
      return wsId
        ? ([resource, "detail", { workspaceId: wsId, id }] as QueryKey)
        : ([resource, id] as QueryKey);
    },
    /**
     * Key for options/dropdown data
     */
    options: (workspaceId?: string | null) => {
      const wsId = workspaceId ?? getActiveWorkspaceId();
      return wsId
        ? ([resource, "options", { workspaceId: wsId }] as QueryKey)
        : ([resource, "options"] as QueryKey);
    },
  };
};

/**
 * Invalidates all queries for a resource in the current workspace
 */
export const invalidateResourceQueries = async (
  queryClient: QueryClient,
  resource: string,
  opts?: { id?: string; workspaceId?: string }
) => {
  const workspaceId = opts?.workspaceId ?? getActiveWorkspaceId();
  const keys = createCrudQueryKeys(resource);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.list(undefined, workspaceId) }),
    opts?.id
      ? queryClient.invalidateQueries({ queryKey: keys.detail(opts.id, workspaceId) })
      : Promise.resolve(),
  ]);
};

/**
 * Invalidates ALL workspace-scoped queries across all resources.
 * Called when switching workspaces to clear stale cache.
 */
export const invalidateAllWorkspaceQueries = async (queryClient: QueryClient) => {
  // Clear all queries that might be workspace-scoped
  // This is a broad invalidation - alternatively, we could track resources
  await queryClient.invalidateQueries();
};

/**
 * Removes all queries from the cache that belong to a specific workspace.
 * More aggressive than invalidate - actually removes from cache.
 */
export const clearWorkspaceQueryCache = (queryClient: QueryClient, workspaceId?: string | null) => {
  const wsId = workspaceId ?? getActiveWorkspaceId();
  if (!wsId) {return;}

  // Remove all queries that have this workspaceId in their key
  queryClient.removeQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return key.some(
        (part) =>
          typeof part === "object" &&
          part !== null &&
          "workspaceId" in part &&
          (part as { workspaceId?: string }).workspaceId === wsId
      );
    },
  });
};
