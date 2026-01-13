import { randomUUID } from "crypto";
import { HEADER_REQUEST_ID, HEADER_TENANT_ID } from "../request-context";

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
  const requestId = (req.headers?.[HEADER_REQUEST_ID] as string | undefined) || randomUUID();
  const tenantId = req.headers?.[HEADER_TENANT_ID] as string | undefined;
  const actorUserId = req.user?.id;
  const ctx: RequestContext = { requestId, tenantId, actorUserId };
  req.context = ctx;
  return ctx;
};
