import {
  KnowledgeAnswerSchema,
  ProcedureDetailSchema,
  ProcedureListSchema,
  PublishedProcedureReaderDetailSchema,
  PublishedProcedureSearchResultSchema,
  PublishedProcedureSummarySchema,
} from "@corely/contracts";
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
        cache: "no-store",
      },
      { workspaceScope: "none", signal, idempotencyKey, parseJson }
    );
  }
  return {
    ask: async (question: string) =>
      KnowledgeAnswerSchema.parse(
        await api.request(
          "/copilot/knowledge/answer",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Workspace-Id": workspaceId },
            body: JSON.stringify({ question }),
            cache: "no-store",
          },
          { workspaceScope: "none" }
        )
      ),
    list: async (signal: AbortSignal) => ProcedureListSchema.parse(await request("", {}, signal)),
    detail: async (id: string, signal: AbortSignal) =>
      ProcedureDetailSchema.parse(await request(`/${encodeURIComponent(id)}`, {}, signal)),
    searchPublished: async (query: string, signal: AbortSignal) =>
      PublishedProcedureSearchResultSchema.parse(
        await request(`/published?${new URLSearchParams({ query })}`, {}, signal)
      ),
    published: async (id: string, signal: AbortSignal) =>
      PublishedProcedureReaderDetailSchema.parse(
        await request(`/published/${encodeURIComponent(id)}`, {}, signal)
      ),
    previewPublished: async (id: string, signal: AbortSignal) =>
      PublishedProcedureSummarySchema.parse(
        await request(`/published/${encodeURIComponent(id)}/preview`, {}, signal)
      ),
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
    download: async (id: string, fileId: string, publishedOnly = false) =>
      (
        await request<Response>(
          `${publishedOnly ? "/published" : ""}/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`,
          {},
          undefined,
          undefined,
          false
        )
      ).blob(),
  };
}
export type ProceduresClient = ReturnType<typeof createProceduresClient>;
