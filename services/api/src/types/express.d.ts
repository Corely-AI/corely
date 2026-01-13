import type { RequestContext, RequestPrincipal } from "../shared/request-context";

declare module "express-serve-static-core" {
  interface Request {
    context?: RequestContext;
    user?: RequestPrincipal;
    tenantId?: string;
    workspaceId?: string | null;
    roleIds?: string[];
    traceId?: string;
    id?: string;
    idempotencyKey?: string;
    idempotencyAction?: string;
    idempotencyTenantId?: string;
  }
}
