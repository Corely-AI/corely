import type { RequestContext, RequestPrincipal } from "../shared/request-context";
import type { PublicWorkspaceContext } from "../shared/public";
import type { SurfaceId } from "@corely/contracts";

declare module "express-serve-static-core" {
  interface Request {
    context?: RequestContext;
    user?: RequestPrincipal;
    tenantId?: string;
    workspaceId?: string | null;
    surfaceId?: SurfaceId;
    roleIds?: string[];
    traceId?: string;
    id?: string;
    publicContext?: PublicWorkspaceContext;
    idempotencyKey?: string;
    idempotencyAction?: string;
    idempotencyTenantId?: string;
  }
}
