import type { ApiClient } from "@corely/auth-client";
import { StaffSelfViewSchema, StaffLifecycleViewSchema } from "@corely/contracts";
export function createStaffJourneyClient(api: Pick<ApiClient, "request">, workspaceId: string) {
  function request(path: string, options: RequestInit = {}, signal?: AbortSignal, key?: string) {
    if (!workspaceId) {
      return Promise.reject(new Error("Workspace required"));
    }
    return api.request(
      `/people${path}`,
      { ...options, headers: { ...options.headers, "X-Workspace-Id": workspaceId } },
      { workspaceScope: "none", signal, idempotencyKey: key }
    );
  }
  const write = (path: string, method: string, body: unknown, key: string) =>
    request(
      path,
      { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      undefined,
      key
    );
  return {
    self: async (signal: AbortSignal) =>
      StaffSelfViewSchema.parse(await request("/me", {}, signal)),
    saveSelf: async (body: unknown, key: string) =>
      StaffSelfViewSchema.parse(await write("/me", "PATCH", body, key)),
    lifecycle: async (id: string, signal: AbortSignal) =>
      StaffLifecycleViewSchema.parse(
        await request(`/staff/${encodeURIComponent(id)}/lifecycle`, {}, signal)
      ),
    lifecycleCommand: async (
      id: string,
      action: "onboarding" | "offboard",
      body: unknown,
      key: string
    ) =>
      StaffLifecycleViewSchema.parse(
        await write(`/staff/${encodeURIComponent(id)}/${action}`, "POST", body, key)
      ),
  };
}
export type StaffJourneyClient = ReturnType<typeof createStaffJourneyClient>;
