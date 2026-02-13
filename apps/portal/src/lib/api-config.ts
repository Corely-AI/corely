const DEFAULT_PORTAL_API_BASE_URL = "/api";
const DEFAULT_PUBLIC_WORKSPACE_BASE_DOMAINS = "portal.corely.one,my.corely.one";

const normalizeCsv = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

const normalizeBaseUrl = (value: string | undefined): string => {
  const raw = value?.trim();
  if (!raw) {
    return DEFAULT_PORTAL_API_BASE_URL;
  }

  // Keep origin-only URLs clean and avoid accidental double slashes in joins.
  return raw.replace(/\/+$/, "");
};

const normalizePath = (path: string): string => {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
};

const extractFromPath = (pathname: string): string | null => {
  const match = pathname.match(/^\/w\/([^/]+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
};

const extractFromHost = (hostname: string, baseDomains: string[]): string | null => {
  const host = hostname.toLowerCase();

  for (const baseDomain of baseDomains) {
    if (host === baseDomain || !host.endsWith(`.${baseDomain}`)) {
      continue;
    }

    const slug = host.slice(0, -1 * (baseDomain.length + 1));
    if (!slug || slug.includes(".")) {
      return null;
    }

    return slug;
  }

  return null;
};

export const getPortalApiBaseUrl = (): string =>
  normalizeBaseUrl(import.meta.env.VITE_PORTAL_API_BASE_URL);

export const getPublicWorkspaceBaseDomains = (): string[] =>
  normalizeCsv(
    import.meta.env.VITE_PUBLIC_WORKSPACE_BASE_DOMAINS || DEFAULT_PUBLIC_WORKSPACE_BASE_DOMAINS
  ).sort((a, b) => b.length - a.length);

export function resolveWorkspaceSlug(): string | null {
  const slugFromPath = extractFromPath(window.location.pathname);
  if (slugFromPath) {
    return slugFromPath;
  }

  const slugFromHost = extractFromHost(window.location.hostname, getPublicWorkspaceBaseDomains());
  if (slugFromHost) {
    return slugFromHost;
  }

  const params = new URLSearchParams(window.location.search);
  const slugFromQuery = params.get("w")?.trim().toLowerCase();
  if (slugFromQuery) {
    return slugFromQuery;
  }

  const slugFromEnv = import.meta.env.VITE_PORTAL_WORKSPACE_SLUG?.trim().toLowerCase();
  if (slugFromEnv) {
    return slugFromEnv;
  }

  return null;
}

export function buildPortalApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  const workspaceSlug = resolveWorkspaceSlug();
  const workspacePrefix = workspaceSlug ? `/w/${workspaceSlug}` : "";
  const apiPath = `${workspacePrefix}${normalizedPath}`;
  return `${getPortalApiBaseUrl()}${apiPath}`;
}
