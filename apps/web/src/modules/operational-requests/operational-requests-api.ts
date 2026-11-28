import {
  OperationalRequestRouteSchema,
  OperationalRequestSchema,
  OperationalRequestsPageSchema,
  type OperationalRequestDraft,
  type OperationalRequestKind,
} from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { z } from "zod";

const root = "/operational-requests";
const path = (id: string) => `${root}/${encodeURIComponent(id)}`;
const linkSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//i.test(value)),
});

export function createRequestsClient(workspaceId: string) {
  function get(endpoint: string, signal?: AbortSignal) {
    return apiClient.request(
      endpoint,
      {
        method: "GET",
        headers: { "X-Workspace-Id": workspaceId },
      },
      { workspaceScope: "none", signal }
    );
  }

  function write(
    endpoint: string,
    method: "POST" | "PATCH",
    body: unknown,
    idempotencyKey: string
  ) {
    return apiClient.request(
      endpoint,
      {
        method,
        headers: { "X-Workspace-Id": workspaceId, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      { workspaceScope: "none", idempotencyKey }
    );
  }

  return {
    async list(page: number, signal?: AbortSignal) {
      return OperationalRequestsPageSchema.parse(await get(`${root}?page=${page}`, signal));
    },
    async get(id: string, signal?: AbortSignal) {
      return OperationalRequestSchema.parse(await get(path(id), signal));
    },
    async create(draft: OperationalRequestDraft, key: string) {
      return OperationalRequestSchema.parse(await write(root, "POST", draft, key));
    },
    async save(id: string, version: number, draft: OperationalRequestDraft, key: string) {
      return OperationalRequestSchema.parse(
        await write(path(id), "PATCH", { version, draft }, key)
      );
    },
    async linkProcedure(id: string, version: number, procedureId: string | null, key: string) {
      return OperationalRequestSchema.parse(
        await write(`${path(id)}/procedure`, "PATCH", { version, procedureId }, key)
      );
    },
    async transition(id: string, command: "submit" | "withdraw", version: number, key: string) {
      return OperationalRequestSchema.parse(
        await write(`${path(id)}/${command}`, "POST", { version }, key)
      );
    },
    async attach(id: string, version: number, file: File, base64: string, key: string) {
      return OperationalRequestSchema.parse(
        await write(
          `${path(id)}/attachments`,
          "POST",
          {
            version,
            name: file.name,
            mediaType: file.type,
            base64,
          },
          key
        )
      );
    },
    async fileLink(id: string, attachmentId: string) {
      return linkSchema.parse(
        await get(`${path(id)}/attachments/${encodeURIComponent(attachmentId)}/download`)
      ).url;
    },
    async policyLink(documentId: string) {
      return linkSchema.parse(
        await get(`/documents/${encodeURIComponent(documentId)}/download-url`)
      ).url;
    },
    async routes(signal?: AbortSignal) {
      return z.array(OperationalRequestRouteSchema).parse(await get(`${root}/routing`, signal));
    },
    async saveRoute(kind: OperationalRequestKind, reviewerUserId: string, key: string) {
      return OperationalRequestRouteSchema.parse(
        await write(`${root}/routing/${kind}`, "POST", { reviewerUserId }, key)
      );
    },
  };
}

export type OperationalRequestsClient = ReturnType<typeof createRequestsClient>;
