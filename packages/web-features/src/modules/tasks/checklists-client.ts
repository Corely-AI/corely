import type { ApiClient } from "@corely/auth-client";
import { ChecklistTemplateListSchema, ChecklistTemplateViewSchema } from "@corely/contracts";
export function createChecklistsClient(api: Pick<ApiClient, "request">, workspaceId: string) {
  async function request(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
    key?: string
  ) {
    if (!workspaceId) {
      throw new Error("Workspace required");
    }
    return api.request(
      `/tasks/recurring${path}`,
      { ...options, headers: { ...options.headers, "X-Workspace-Id": workspaceId } },
      { workspaceScope: "none", signal, idempotencyKey: key }
    );
  }
  return {
    list: async (page: number, signal: AbortSignal) =>
      ChecklistTemplateListSchema.parse(await request(`?page=${page}&pageSize=10`, {}, signal)),
    command: async (path: string, body: unknown, key: string) =>
      ChecklistTemplateViewSchema.parse(
        await request(
          path,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          undefined,
          key
        )
      ),
  };
}
export type ChecklistsClient = ReturnType<typeof createChecklistsClient>;
