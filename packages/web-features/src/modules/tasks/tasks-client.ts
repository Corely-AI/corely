import type { ApiClient } from "@corely/auth-client";
import { EmployeeTaskListSchema, EmployeeTaskSchema, TaskAssigneeSchema } from "@corely/contracts";
export function createTasksClient(api: Pick<ApiClient, "request">, workspaceId: string) {
  function request<T>(path: string, options: RequestInit = {}, signal?: AbortSignal, key?: string) {
    if (!workspaceId) {
      return Promise.reject(new Error("Workspace required"));
    }
    return api.request<T>(
      `/tasks${path}`,
      { ...options, headers: { ...options.headers, "X-Workspace-Id": workspaceId } },
      { workspaceScope: "none", signal, idempotencyKey: key }
    );
  }
  return {
    list: async (query: string, signal: AbortSignal) =>
      EmployeeTaskListSchema.parse(await request(`?${query}`, {}, signal)),
    assignees: async (signal: AbortSignal) =>
      TaskAssigneeSchema.array().parse(await request("/assignees", {}, signal)),
    command: async (path: string, method: string, body: unknown, key: string) =>
      EmployeeTaskSchema.parse(
        await request(
          path,
          { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
          undefined,
          key
        )
      ),
  };
}
export type TasksClient = ReturnType<typeof createTasksClient>;
