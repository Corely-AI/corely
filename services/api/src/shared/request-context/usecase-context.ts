import type { UseCaseContext } from "@corely/kernel";
import { resolveRequestContext } from "./request-context.resolver";
import type { ContextAwareRequest } from "./request-context.types";

export const toUseCaseContext = (req: ContextAwareRequest): UseCaseContext => {
  const ctx = req.context ?? resolveRequestContext(req);
  return {
    tenantId: ctx.tenantId,
    workspaceId: ctx.workspaceId ?? undefined,
    surfaceId: ctx.surfaceId,
    userId: ctx.userId,
    activeAppId: ctx.activeAppId,
    correlationId: ctx.correlationId ?? ctx.requestId,
    requestId: ctx.requestId,
    roles: ctx.roles,
    metadata: ctx.metadata,
  };
};

/** Bind identity to the authenticated principal; the use case authorizes the selected workspace. */
export const toAuthenticatedWorkspaceContext = (req: ContextAwareRequest): UseCaseContext => ({
  ...toUseCaseContext(req),
  userId: req.user?.userId,
  tenantId: req.user?.tenantId,
});
