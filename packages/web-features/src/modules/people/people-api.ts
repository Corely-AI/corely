import { apiClient } from "@corely/web-shared/lib/api-client";
import { getActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";
import type {
  StaffDirectoryEntry,
  StaffProfile,
  StaffPrivate,
  StaffList,
  StaffAvailabilityView,
  StaffAbsence,
  PersonnelAttachment,
} from "@corely/contracts";
import type { FeatureHttpClient } from "@corely/web-shared/session/feature-http-client";
export function createPeopleApi(
  api: Pick<FeatureHttpClient, "request">,
  workspace: () => string | null,
  focused = false
) {
  const root = "/people/staff";
  function request<T>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
    key?: string,
    parseJson = true
  ) {
    // Capture the selected workspace before token refresh/async storage. A pending
    // action must never adopt a newly selected workspace while waiting to send.
    const workspaceId = workspace();
    if (!workspaceId) {
      return Promise.reject(new Error("Workspace required"));
    }
    return api.request<T>(
      `${root}${path}`,
      {
        ...options,
        headers: focused ? options.headers : { ...options.headers, "X-Workspace-Id": workspaceId },
      },
      { workspaceScope: focused ? "active" : "none", signal, idempotencyKey: key, parseJson }
    );
  }
  const absencePath = (id: string, absenceId?: string) =>
    `/${encodeURIComponent(id)}/absences${absenceId ? `/${encodeURIComponent(absenceId)}` : ""}`;
  return {
    absences: (id: string, signal: AbortSignal) =>
      request<{ items: StaffAbsence[] }>(absencePath(id), {}, signal),
    absenceCommand: (
      id: string,
      absenceId: string | undefined,
      action: "record" | "correct" | "cancel",
      body: unknown,
      key: string
    ) =>
      request<StaffAbsence>(
        `${absencePath(id, absenceId)}${action === "cancel" ? "/cancel" : ""}`,
        {
          method: action === "correct" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        undefined,
        key
      ),
    absenceAttachments: (id: string, absenceId: string, signal: AbortSignal) =>
      request<{ items: PersonnelAttachment[] }>(
        `${absencePath(id, absenceId)}/attachments`,
        {},
        signal
      ),
    uploadAbsenceAttachment: (id: string, absenceId: string, body: unknown, key: string) =>
      request<PersonnelAttachment>(
        `${absencePath(id, absenceId)}/attachments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        undefined,
        key
      ),
    downloadAbsenceAttachment: async (
      id: string,
      absenceId: string,
      documentId: string,
      signal: AbortSignal
    ) => {
      const response = await request<Response>(
        `${absencePath(id, absenceId)}/attachments/${encodeURIComponent(documentId)}/download`,
        {},
        signal,
        undefined,
        false
      );
      return response.blob();
    },
    availability: (id: string, signal: AbortSignal) =>
      request<StaffAvailabilityView>(`/${encodeURIComponent(id)}/availability`, {}, signal),
    saveAvailability: (id: string, body: unknown, key: string) =>
      request<StaffAvailabilityView>(
        `/${encodeURIComponent(id)}/availability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        undefined,
        key
      ),
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
}
export const peopleApi = createPeopleApi(apiClient, getActiveWorkspaceId);
export type PeopleApi = ReturnType<typeof createPeopleApi>;
