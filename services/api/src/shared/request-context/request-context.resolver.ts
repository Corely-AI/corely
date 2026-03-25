import { createHash, randomUUID, timingSafeEqual } from "crypto";
import {
  HEADER_APP_ID,
  HEADER_CORELY_PROXY_KEY,
  HEADER_CORELY_SURFACE,
  HEADER_CORRELATION_ID,
  HEADER_REQUEST_ID,
  HEADER_TENANT_ID,
  HEADER_TRACE_ID,
  HEADER_WORKSPACE_ID,
} from "./request-context.headers";
import type { ContextAwareRequest, RequestContext } from "./request-context.types";
import { PUBLIC_CONTEXT_METADATA_KEY, type PublicWorkspaceContext } from "../public";
import { mapDeclaredSurfaceToSurfaceId, normalizeDeclaredSurface } from "./request-surface";

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

const hashSecret = (value: string) => createHash("sha256").update(value).digest();

const equalsSecret = (candidate: string | undefined, expected: string | undefined): boolean => {
  if (!candidate || !expected) {
    return false;
  }
  return timingSafeEqual(hashSecret(candidate), hashSecret(expected));
};

const resolveTrustedSurfaceId = (proxyKey: string | undefined) => {
  const candidates = [
    {
      envKey: "CORELY_PROXY_KEY_APP",
      surfaceId: "platform" as const,
    },
    {
      envKey: "CORELY_PROXY_KEY_POS",
      surfaceId: "pos" as const,
    },
    {
      envKey: "CORELY_PROXY_KEY_CRM",
      surfaceId: "crm" as const,
    },
  ];

  let resolvedSurfaceId: "platform" | "pos" | "crm" | null = null;
  for (const candidate of candidates) {
    if (equalsSecret(proxyKey, process.env[candidate.envKey])) {
      resolvedSurfaceId = candidate.surfaceId;
    }
  }

  return resolvedSurfaceId;
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
  const activeAppId = pickHeader(req, [HEADER_APP_ID]);
  const proxyKey = pickHeader(req, [HEADER_CORELY_PROXY_KEY]);
  const declaredSurfaceId = pickHeader(req, [HEADER_CORELY_SURFACE])?.trim().toLowerCase();
  const trustedSurfaceId = resolveTrustedSurfaceId(proxyKey);
  const normalizedDeclaredSurface = normalizeDeclaredSurface(declaredSurfaceId);
  const declaredResolvedSurfaceId = normalizedDeclaredSurface
    ? mapDeclaredSurfaceToSurfaceId(normalizedDeclaredSurface)
    : null;
  const surfaceHeaderMismatch = Boolean(
    trustedSurfaceId && declaredResolvedSurfaceId && trustedSurfaceId !== declaredResolvedSurfaceId
  );

  const requestId = headerRequestId || traceId || randomUUID();
  const correlationId = correlationHeader || requestId;
  const surfaceId = trustedSurfaceId ?? "platform";

  // Principal
  const headerUserId = pickHeader(req, ["x-user-id"]);
  const userId = req.user?.userId ?? headerUserId;
  const roleIds = Array.isArray(req.user?.roleIds) ? req.user?.roleIds : undefined;

  const publicContext: PublicWorkspaceContext | undefined = req.publicContext;
  const usePublicContext = Boolean(publicContext);

  // Workspace / tenant with precedence
  const routeWorkspaceId = (req.params as Record<string, string | undefined> | undefined)
    ?.workspaceId;
  const headerWorkspaceId = pickHeader(req, [HEADER_WORKSPACE_ID]);
  const headerTenantId = pickHeader(req, [HEADER_TENANT_ID]);
  const queryTenantId = (req.query as Record<string, string | undefined> | undefined)?.[
    HEADER_TENANT_ID
  ];
  const plainQueryTenantId = (req.query as Record<string, string | undefined> | undefined)?.[
    "tenantId"
  ];

  const queryWorkspaceId = (req.query as Record<string, string | undefined> | undefined)?.[
    HEADER_WORKSPACE_ID
  ];
  const plainQueryWorkspaceId = (req.query as Record<string, string | undefined> | undefined)?.[
    "workspaceId"
  ];

  // Prefer explicit workspace header (active workspace) over route param to support
  // cross-workspace requests where the route carries tenantId.
  const workspaceId =
    (usePublicContext ? publicContext?.workspaceId : undefined) ??
    headerWorkspaceId ??
    queryWorkspaceId ??
    plainQueryWorkspaceId ??
    routeWorkspaceId ??
    req.user?.workspaceId ??
    null;

  const userTenantId = req.user?.tenantId;
  const resolvedUserTenantId =
    userTenantId === null || typeof userTenantId === "string" ? userTenantId : undefined;

  const tenantId =
    (usePublicContext ? publicContext?.tenantId : undefined) ??
    (resolvedUserTenantId !== undefined
      ? resolvedUserTenantId
      : (headerTenantId ?? queryTenantId ?? plainQueryTenantId ?? undefined));

  const finalUserId = userId;
  const userSource: RequestContext["sources"][keyof RequestContext["sources"]] | undefined = userId
    ? "user"
    : undefined;

  const metadata = usePublicContext
    ? {
        ...(req.context?.metadata ?? {}),
        [PUBLIC_CONTEXT_METADATA_KEY]: {
          workspaceSlug: publicContext?.workspaceSlug ?? "",
          resolutionMethod: publicContext?.resolutionMethod ?? "path",
          publicEnabled: publicContext?.publicEnabled ?? false,
          publicModules: publicContext?.publicModules ?? undefined,
        },
      }
    : req.context?.metadata;

  const ctx: RequestContext = {
    requestId,
    correlationId,
    userId: finalUserId,
    tenantId,
    workspaceId,
    surfaceId,
    trustedSurfaceId,
    declaredSurfaceId,
    surfaceResolutionSource: trustedSurfaceId ? "proxy-key" : "fallback",
    surfaceHeaderMismatch,
    activeAppId,
    roles: roleIds,
    metadata,
    sources: {
      requestId: headerRequestId ? "header" : traceId ? "route" : "generated",
      correlationId: correlationHeader ? "header" : "inferred",
      userId: userSource,
      tenantId:
        tenantId !== undefined
          ? usePublicContext
            ? "public"
            : tenantId === req.user?.tenantId
              ? "user"
              : "header"
          : undefined,
      workspaceId: workspaceId
        ? usePublicContext
          ? "public"
          : headerWorkspaceId
            ? "header"
            : routeWorkspaceId
              ? "route"
              : req.user?.workspaceId
                ? "user"
                : undefined
        : undefined,
      surfaceId: trustedSurfaceId ? "proxy" : "inferred",
      trustedSurfaceId: trustedSurfaceId ? "proxy" : undefined,
      declaredSurfaceId: declaredSurfaceId ? "header" : undefined,
      activeAppId: activeAppId ? "header" : undefined,
    },
    deprecated: {},
  };

  if (surfaceHeaderMismatch && debug) {
    debug.warn(
      {
        declaredSurfaceId,
        trustedSurfaceId,
        route: req.originalUrl ?? req.url,
      },
      "RequestContextResolver: x-corely-surface does not match trusted proxy key"
    );
  }

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
  req.surfaceId = surfaceId;
  req.activeAppId = activeAppId;
  req.roleIds = roleIds;
  req.id = requestId;

  return ctx;
};
