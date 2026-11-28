import type { ApiClient } from "@corely/auth-client";
import type { z } from "zod";
import {
  EmployeeTaskListSchema,
  EmployeeTaskSchema,
  TaskAssigneeSchema,
  TaskContextSchema,
  type TaskAttachmentUploadSchema,
  type TaskSource,
} from "@corely/contracts";
export function createTasksClient(api: Pick<ApiClient, "request">, workspaceId: string) {
  function request<T>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
    key?: string,
    parseJson = true
  ) {
    if (!workspaceId) {
      return Promise.reject(new Error("Workspace required"));
    }
    return api.request<T>(
      `/tasks${path}`,
      { ...options, headers: { ...options.headers, "X-Workspace-Id": workspaceId } },
      { workspaceScope: "none", signal, idempotencyKey: key, parseJson }
    );
  }
  const pathFor = (taskId: string) => "/" + encodeURIComponent(taskId) + "/context";
  const writeContext = async (taskId: string, kind: string, input: unknown, key: string) =>
    TaskContextSchema.parse(
      await request(
        pathFor(taskId) + "/" + kind,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        undefined,
        key
      )
    );
  return {
    context: {
      get: async (taskId: string, signal: AbortSignal) =>
        TaskContextSchema.parse(await request(pathFor(taskId), {}, signal)),
      comment: (taskId: string, text: string, key: string) =>
        writeContext(taskId, "comments", { text }, key),
      addSource: (taskId: string, source: TaskSource, key: string) =>
        writeContext(taskId, "sources", source, key),
      upload: (taskId: string, file: z.infer<typeof TaskAttachmentUploadSchema>, key: string) =>
        writeContext(taskId, "files", file, key),
      async download(taskId: string, documentId: string) {
        const response = await request<Response>(
          pathFor(taskId) + "/files/" + encodeURIComponent(documentId),
          {},
          undefined,
          undefined,
          false
        );
        return response.blob();
      },
    },
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
type FullTasksClient = ReturnType<typeof createTasksClient>;
export type TaskContextClient = FullTasksClient["context"];
export type TasksClient = Omit<FullTasksClient, "context"> & { context?: TaskContextClient };
