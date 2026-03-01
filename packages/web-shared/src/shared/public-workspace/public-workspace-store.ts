let publicWorkspaceSlug: string | null = null;
const subscribers = new Set<(slug: string | null) => void>();

export const setPublicWorkspaceSlug = (slug: string | null): void => {
  publicWorkspaceSlug = slug;
  subscribers.forEach((listener) => listener(slug));
};

export const getPublicWorkspaceSlug = (): string | null => publicWorkspaceSlug;

export const subscribePublicWorkspace = (listener: (slug: string | null) => void): (() => void) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};

export const extractWorkspaceSlugFromPath = (pathname: string): string | null => {
  const match = pathname.match(/^\/w\/([^/]+)(?:\/|$)/i);
  return match?.[1] ?? null;
};

export const resolvePublicWorkspaceSlug = (): string | null => {
  if (publicWorkspaceSlug) {
    return publicWorkspaceSlug;
  }
  if (typeof window === "undefined") {
    return null;
  }
  const fromPath = extractWorkspaceSlugFromPath(window.location.pathname);
  if (fromPath) {
    return fromPath;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("w");
};

export const resolvePublicWorkspacePathPrefix = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const fromPath = extractWorkspaceSlugFromPath(window.location.pathname);
  return fromPath ? `/w/${fromPath}` : null;
};
