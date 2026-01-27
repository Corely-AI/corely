import { randomUUID } from "crypto";
import {
  HEADER_CORRELATION_ID,
  HEADER_REQUEST_ID,
  HEADER_TENANT_ID,
  HEADER_TRACE_ID,
  HEADER_WORKSPACE_ID,
} from "./request-context.headers";
import type { ContextAwareRequest, RequestContext } from "./request-context.types";

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const pickHeader = (req: ContextAwareRequest, names: string[]): string | undefined => {
  for (const name of names) {
    const value = req.headers?.[name];
    if (Array.isArray(value)) {
      const first = value.find(isString);
      if (first) {
        return first;
      }
      continue;
    }
    if (isString(value)) {
      return value;
    }
  }
  return undefined;
};

export const resolveRequestContext = (req: ContextAwareRequest): RequestContext => {
  const debug =
    typeof (req as any).log?.child === "function"
      ? (req as any).log.child({ scope: "RequestContext" })
      : null;
  // Request ID / correlation
  const headerRequestId = pickHeader(req, [HEADER_REQUEST_ID]);
  const traceIdHeader = pickHeader(req, [HEADER_TRACE_ID]);
  const correlationHeader = pickHeader(req, [HEADER_CORRELATION_ID]);
  const traceId = req.traceId || traceIdHeader;

  const requestId = headerRequestId || traceId || randomUUID();
  const correlationId = correlationHeader || requestId;

  // Principal
  const headerUserId = pickHeader(req, ["x-user-id"]);
  const userId = req.user?.userId ?? headerUserId;
  const roleIds = Array.isArray(req.user?.roleIds) ? req.user?.roleIds : undefined;

  // Workspace / tenant with precedence
  const routeWorkspaceId = (req.params as Record<string, string | undefined> | undefined)
    ?.workspaceId;
  const headerWorkspaceId = pickHeader(req, [HEADER_WORKSPACE_ID]);
  const headerTenantId = pickHeader(req, [HEADER_TENANT_ID]);

  // Prefer explicit workspace header (active workspace) over route param to support
  // cross-workspace requests where the route carries tenantId.
  const workspaceId = headerWorkspaceId ?? routeWorkspaceId ?? req.user?.workspaceId ?? null;

  const tenantId = req.user?.tenantId ?? headerTenantId ?? undefined;

  const finalUserId = userId;
  const userSource: RequestContext["sources"][keyof RequestContext["sources"]] | undefined = userId
    ? "user"
    : undefined;

  const ctx: RequestContext = {
    requestId,
    correlationId,
    userId: finalUserId,
    tenantId,
    workspaceId,
    roles: roleIds,
    sources: {
      requestId: headerRequestId ? "header" : traceId ? "route" : "generated",
      correlationId: correlationHeader ? "header" : "inferred",
      userId: userSource,
      tenantId: tenantId ? (tenantId === req.user?.tenantId ? "user" : "header") : undefined,
      workspaceId: workspaceId
        ? headerWorkspaceId
          ? "header"
          : routeWorkspaceId
            ? "route"
            : req.user?.workspaceId
              ? "user"
              : undefined
        : undefined,
    },
    deprecated: {},
  };

  if (!workspaceId && debug) {
    debug.warn(
      {
        routeWorkspaceId,
        headerWorkspaceId,
        userWorkspaceId: req.user?.workspaceId,
      },
      "RequestContextResolver: workspaceId is missing"
    );
  }

  // Attach for downstream consumers
  req.context = ctx;
  req.tenantId = tenantId;
  req.workspaceId = workspaceId;
  req.roleIds = roleIds;
  req.id = requestId;

  return ctx;
};
