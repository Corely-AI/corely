import type { RequestContext, RequestPrincipal } from "../shared/request-context";
import type { PublicWorkspaceContext } from "../shared/public";

declare module "express-serve-static-core" {
  interface Request {
    context?: RequestContext;
    user?: RequestPrincipal;
    tenantId?: string;
    workspaceId?: string | null;
    roleIds?: string[];
    traceId?: string;
    id?: string;
    publicContext?: PublicWorkspaceContext;
    idempotencyKey?: string;
    idempotencyAction?: string;
    idempotencyTenantId?: string;
  }
}
