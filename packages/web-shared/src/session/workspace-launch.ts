import {
  AppLaunchOriginSchema,
  isSafeSsoReturnPath,
  SsoAppKeySchema,
  type SsoAppKey,
} from "@corely/contracts";

const workspaceIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
export type WorkspaceHint =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "requested"; workspaceId: string };

export function readWorkspaceHint(search: string): WorkspaceHint {
  const hints = new URLSearchParams(search).getAll("workspaceId");
  if (!hints.length) {
    return { kind: "absent" };
  }
  return hints.length === 1 && workspaceIdPattern.test(hints[0])
    ? { kind: "requested", workspaceId: hints[0] }
    : { kind: "invalid" };
}

/** Exact configured destination only; no credential, tenant or arbitrary return URL handoff. */
export function workspaceLaunchUrl(
  origin: string,
  workspaceId: string,
  relativeRoute = "/"
): string | undefined {
  const parsed = AppLaunchOriginSchema.safeParse(origin);
  if (
    !parsed.success ||
    !workspaceIdPattern.test(workspaceId) ||
    !isSafeSsoReturnPath(relativeRoute)
  ) {
    return undefined;
  }
  const url = new URL(relativeRoute, parsed.data);
  if (url.pathname !== relativeRoute.split(/[?#]/)[0] || url.hash.includes("=")) {
    return undefined;
  }
  for (const name of url.searchParams.keys()) {
    if (
      /^(?:workspaceId|tenantId|userId|token|access.?token|refresh.?token|csrf.?token|sessionId|authorization|password|secret|code|returnUrl|redirectTo)$/i.test(
        name
      )
    ) {
      return undefined;
    }
  }
  url.searchParams.set("workspaceId", workspaceId);
  return url.href;
}

export function buildWorkspaceDeepLink(
  destination: SsoAppKey,
  origins: Partial<Record<SsoAppKey, string>>,
  workspaceId: string,
  relativeRoute = "/"
): string | undefined {
  const app = SsoAppKeySchema.safeParse(destination);
  const origin = app.success ? origins[app.data] : undefined;
  return origin ? workspaceLaunchUrl(origin, workspaceId, relativeRoute) : undefined;
}

export interface SessionWorkspaceScope {
  userId: string;
  tenantId: string;
  workspaceId: string;
  appKey: SsoAppKey;
}
export function sessionScopeQueryKey(
  scope: SessionWorkspaceScope,
  resource: string,
  ...parts: readonly unknown[]
) {
  return [
    "session",
    scope.userId,
    scope.tenantId,
    scope.workspaceId,
    scope.appKey,
    resource,
    ...parts,
  ] as const;
}
