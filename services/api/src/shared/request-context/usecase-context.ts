import type { UseCaseContext } from "@corely/kernel";
import { resolveRequestContext } from "./request-context.resolver";
import type { ContextAwareRequest } from "./request-context.types";

export const toUseCaseContext = (req: ContextAwareRequest): UseCaseContext => {
  const ctx = req.context ?? resolveRequestContext(req);
  return {
    tenantId: ctx.tenantId,
    workspaceId: ctx.workspaceId ?? undefined,
    userId: ctx.userId,
    correlationId: ctx.correlationId ?? ctx.requestId,
    requestId: ctx.requestId,
    roles: ctx.roles,
    metadata: ctx.metadata,
  };
};
