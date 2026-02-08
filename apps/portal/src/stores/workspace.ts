import { request, type RequestOptions } from "@corely/api-client";

/**
 * Resolves the workspace slug for the portal.
 *
 * Resolution order:
 * 1. URL path: /w/:slug (e.g. localhost:8083/w/my-school)
 * 2. Query param: ?w=slug
 * 3. Env var: VITE_PORTAL_WORKSPACE_SLUG (for local dev)
 *
 * The slug is used as a URL prefix in API calls so the backend
 * PublicWorkspacePathMiddleware can resolve tenantId/workspaceId.
 */
export function resolveWorkspaceSlug(): string | null {
  // 1. URL path /w/:slug
  const pathMatch = window.location.pathname.match(/^\/w\/([^/]+)/);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  // 2. Query param ?w=slug
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("w");
  if (querySlug) {
    return querySlug;
  }

  // 3. Env var fallback
  const envSlug = import.meta.env.VITE_PORTAL_WORKSPACE_SLUG;
  if (envSlug) {
    return envSlug;
  }

  return null;
}

/**
 * Returns the API path prefix including the workspace slug.
 * e.g. "/api/w/my-school" or "/api" if no slug.
 */
export function getApiPrefix(): string {
  const slug = resolveWorkspaceSlug();
  return slug ? `/api/w/${slug}` : "/api";
}

/**
 * Portal-aware request helper. Automatically prefixes API paths
 * with the workspace slug so the backend can resolve workspace context.
 *
 * Usage: portalRequest({ url: "/portal/auth/request-code", method: "POST", body: {...} })
 */
export function portalRequest<T = unknown>(
  opts: Omit<RequestOptions, "url"> & { url: string }
): Promise<T> {
  const prefix = getApiPrefix();
  return request<T>({ ...opts, url: `${prefix}${opts.url}` });
}
