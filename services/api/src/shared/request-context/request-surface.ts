import type { SurfaceId } from "@corely/contracts";
import type { RequestContext } from "./request-context.types";

export type SurfaceResolutionSource = "proxy-key" | "fallback";
export type DeclaredSurfaceKey = "app" | "pos" | "crm";

export interface SurfaceAwarePolicyResult {
  ok: boolean;
  errorCode?: "surface-header-mismatch" | "missing-trusted-surface";
  message?: string;
}

export const normalizeDeclaredSurface = (
  value: string | null | undefined
): DeclaredSurfaceKey | null => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "app" || normalized === "pos" || normalized === "crm") {
    return normalized;
  }
  return null;
};

export const mapDeclaredSurfaceToSurfaceId = (value: DeclaredSurfaceKey): SurfaceId => {
  switch (value) {
    case "app":
      return "platform";
    case "pos":
      return "pos";
    case "crm":
      return "crm";
  }
};

export const isTrustedSurfaceResolution = (
  ctx: Pick<RequestContext, "surfaceResolutionSource">
): boolean => ctx.surfaceResolutionSource === "proxy-key";

export const evaluateSurfaceAwareRequest = (
  ctx: Pick<
    RequestContext,
    "declaredSurfaceId" | "surfaceHeaderMismatch" | "surfaceResolutionSource" | "trustedSurfaceId"
  >,
  scope?: "web" | "pos"
): SurfaceAwarePolicyResult => {
  if (ctx.surfaceHeaderMismatch) {
    return {
      ok: false,
      errorCode: "surface-header-mismatch",
      message: "Declared x-corely-surface does not match the trusted proxy surface.",
    };
  }

  if (scope === "pos" && ctx.trustedSurfaceId !== "pos") {
    return {
      ok: false,
      errorCode: "missing-trusted-surface",
      message: "POS scope requires a trusted POS surface resolved via x-corely-proxy-key.",
    };
  }

  const declaredSurface = normalizeDeclaredSurface(ctx.declaredSurfaceId);
  if (declaredSurface && declaredSurface !== "app" && !isTrustedSurfaceResolution(ctx)) {
    return {
      ok: false,
      errorCode: "missing-trusted-surface",
      message:
        "A declared non-platform surface requires a trusted proxy key; browser-sent surface headers are not trusted.",
    };
  }

  return { ok: true };
};

export const buildSurfaceResolutionLogFields = (input: {
  requestContext: Pick<
    RequestContext,
    | "surfaceId"
    | "declaredSurfaceId"
    | "surfaceResolutionSource"
    | "trustedSurfaceId"
    | "surfaceHeaderMismatch"
    | "workspaceId"
  >;
  route: string;
  workspaceId?: string | null;
}) => {
  return {
    resolvedSurfaceId: input.requestContext.surfaceId,
    declaredSurface: input.requestContext.declaredSurfaceId ?? null,
    workspaceId: input.workspaceId ?? input.requestContext.workspaceId ?? null,
    route: input.route,
    surfaceResolution: input.requestContext.surfaceResolutionSource,
    trustedSurfaceId: input.requestContext.trustedSurfaceId ?? null,
    surfaceHeaderMismatch: input.requestContext.surfaceHeaderMismatch,
  };
};
