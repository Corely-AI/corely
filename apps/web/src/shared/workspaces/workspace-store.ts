import { features } from "@/lib/features";

const STORAGE_KEY = "corely-active-workspace";

let activeWorkspaceId: string | null = null;
const subscribers = new Set<(workspaceId: string | null) => void>();

export function loadActiveWorkspaceId(): string | null {
  // OSS mode: always use default tenant, ignore localStorage
  if (!features.multiTenant) {
    return features.defaultTenantId;
  }

  if (activeWorkspaceId) {
    return activeWorkspaceId;
  }
  if (typeof window === "undefined") {
    return null;
  }
  activeWorkspaceId = localStorage.getItem(STORAGE_KEY);
  return activeWorkspaceId;
}

export function getActiveWorkspaceId(): string | null {
  // OSS mode: always use default tenant, ignore localStorage
  if (!features.multiTenant) {
    return features.defaultTenantId;
  }
  return activeWorkspaceId ?? loadActiveWorkspaceId();
}

export function setActiveWorkspaceId(workspaceId: string | null): void {
  // OSS mode: ignore attempts to change workspace, always use default
  if (!features.multiTenant) {
    activeWorkspaceId = features.defaultTenantId;
    subscribers.forEach((fn) => fn(features.defaultTenantId));
    return;
  }

  activeWorkspaceId = workspaceId;
  if (typeof window !== "undefined") {
    if (workspaceId) {
      localStorage.setItem(STORAGE_KEY, workspaceId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  subscribers.forEach((fn) => fn(workspaceId));
}

export function subscribeWorkspace(listener: (workspaceId: string | null) => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
