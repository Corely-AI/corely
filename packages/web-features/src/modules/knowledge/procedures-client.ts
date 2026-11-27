import { ProcedureDetailSchema, ProcedureListSchema } from "@corely/contracts";
import type { FeatureHttpClient } from "@corely/web-shared/session/feature-http-client";

export function createProceduresClient(
  api: Pick<FeatureHttpClient, "request">,
  workspaceId: string
) {
  function request<T>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
    idempotencyKey?: string,
    parseJson = true
  ) {
    return api.request<T>(
      `/knowledge${path}`,
      {
        ...options,
        headers: { ...options.headers, "X-Workspace-Id": workspaceId },
      },
      { workspaceScope: "none", signal, idempotencyKey, parseJson }
    );
  }
  return {
    list: async (signal: AbortSignal) => ProcedureListSchema.parse(await request("", {}, signal)),
    detail: async (id: string, signal: AbortSignal) =>
      ProcedureDetailSchema.parse(await request(`/${encodeURIComponent(id)}`, {}, signal)),
    command: async (path: string, method: "POST" | "PATCH", body: unknown, key: string) =>
      ProcedureDetailSchema.parse(
        await request(
          path,
          {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          undefined,
          key
        )
      ),
    download: async (id: string, fileId: string) =>
      (
        await request<Response>(
          `/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`,
          {},
          undefined,
          undefined,
          false
        )
      ).blob(),
  };
}
export type ProceduresClient = ReturnType<typeof createProceduresClient>;
