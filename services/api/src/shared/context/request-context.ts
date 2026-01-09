import { randomUUID } from "crypto";

export type RequestContext = {
  requestId: string;
  tenantId?: string;
  actorUserId?: string;
};

export const buildRequestContext = (init?: Partial<RequestContext>): RequestContext => {
  return {
    requestId: init?.requestId ?? randomUUID(),
    tenantId: init?.tenantId,
    actorUserId: init?.actorUserId,
  };
};

// Simple middleware signature used by Nest or Express controllers
export type RequestWithContext = {
  headers?: Record<string, string | undefined>;
  user?: { id: string };
  context?: RequestContext;
};

export const attachRequestContext = (req: RequestWithContext): RequestContext => {
  const requestId = (req.headers?.["x-request-id"] as string | undefined) || randomUUID();
  const tenantId = req.headers?.["x-tenant-id"] as string | undefined;
  const actorUserId = req.user?.id;
  const ctx: RequestContext = { requestId, tenantId, actorUserId };
  req.context = ctx;
  return ctx;
};
