import { apiClient } from "@corely/web-shared/lib/api-client";
import { getActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";
import type { StaffDirectoryEntry, StaffProfile, StaffPrivate, StaffList } from "@corely/contracts";
const root = "/people/staff";
function request<T>(path: string, options: RequestInit = {}, signal?: AbortSignal, key?: string) {
  // Capture the selected workspace before token refresh/async storage. A pending
  // action must never adopt a newly selected workspace while waiting to send.
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) {
    return Promise.reject(new Error("Workspace required"));
  }
  return apiClient.request<T>(
    `${root}${path}`,
    {
      ...options,
      headers: { ...options.headers, "X-Workspace-Id": workspaceId },
    },
    { workspaceScope: "none", signal, idempotencyKey: key }
  );
}
export const peopleApi = {
  list: (query: string, signal: AbortSignal) => request<StaffList>(`?${query}`, {}, signal),
  detail: (id: string, manage: boolean, signal: AbortSignal) =>
    request<StaffProfile | StaffDirectoryEntry>(
      `/${encodeURIComponent(id)}${manage ? "/management" : ""}`,
      {},
      signal
    ),
  private: (id: string, signal: AbortSignal) =>
    request<StaffPrivate>(`/${encodeURIComponent(id)}/private`, {}, signal),
  command: (path: string, method: string, body: unknown, key: string) =>
    request<StaffDirectoryEntry>(
      path,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      undefined,
      key
    ),
};
