import { siteConfig } from "./site";
import { resolveWorkspacePathPrefix, resolveWorkspaceSlugFromHost } from "./tenant";

const normalizePath = (path: string): string => (path.startsWith("/") ? path : `/${path}`);

export const resolveSiteOrigin = (input: {
  host?: string | null;
  protocol?: string | null;
}): string => {
  const host = input.host?.split(":")[0];
  if (!host) {
    return siteConfig.siteUrl;
  }
  const protocol = input.protocol ?? "https";
  return `${protocol}://${host}`;
};

export const resolveCanonicalUrl = (input: {
  host?: string | null;
  protocol?: string | null;
  workspaceSlug?: string | null;
  path: string;
}): string => {
  const path = normalizePath(input.path);
  const hostSlug = resolveWorkspaceSlugFromHost(input.host ?? null);
  const origin = hostSlug
    ? resolveSiteOrigin({ host: input.host, protocol: input.protocol })
    : siteConfig.siteUrl;
  const workspacePrefix = hostSlug ? "" : resolveWorkspacePathPrefix(input.workspaceSlug ?? null);
  return `${origin}${workspacePrefix}${path}`;
};

export const buildWorkspacePath = (path: string, workspaceSlug?: string | null): string => {
  const normalized = normalizePath(path);
  if (!workspaceSlug) {
    return normalized;
  }
  return `/w/${workspaceSlug}${normalized}`;
};

export const resolveWorkspacePath = (input: {
  host?: string | null;
  workspaceSlug?: string | null;
  path: string;
}): string => {
  const normalized = normalizePath(input.path);
  const hostSlug = resolveWorkspaceSlugFromHost(input.host ?? null);
  if (hostSlug && input.workspaceSlug && hostSlug === input.workspaceSlug) {
    return normalized;
  }
  return buildWorkspacePath(normalized, input.workspaceSlug ?? null);
};

export const withQuery = (
  baseUrl: string,
  params?: Record<string, string | number | boolean | undefined>
): string => {
  if (!params) {
    return baseUrl;
  }
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  if (!query) {
    return baseUrl;
  }
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${query}`;
};
