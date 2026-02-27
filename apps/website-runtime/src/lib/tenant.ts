import { siteConfig } from "./site";

const normalizeHost = (host: string): string => host.split(":")[0].toLowerCase();

export const resolveWorkspaceSlugFromHost = (host: string | null): string | null => {
  if (!host) {
    return null;
  }

  const normalized = normalizeHost(host);
  const rootDomain = siteConfig.rootDomain.toLowerCase();

  if (normalized === rootDomain || normalized === `www.${rootDomain}`) {
    return null;
  }

  if (normalized.endsWith(`.${rootDomain}`)) {
    const slug = normalized.slice(0, -1 * (rootDomain.length + 1));
    return slug || null;
  }

  return null;
};

export const resolveWorkspaceSlug = (input: {
  host?: string | null;
  workspaceSlugParam?: string | null;
}): string | null => {
  if (input.workspaceSlugParam) {
    return input.workspaceSlugParam;
  }
  return resolveWorkspaceSlugFromHost(input.host ?? null);
};

export const resolveWorkspacePathPrefix = (workspaceSlug: string | null): string =>
  workspaceSlug ? `/w/${workspaceSlug}` : "";
