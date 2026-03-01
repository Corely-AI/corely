/**
 * Build the student/guardian portal URL for a given workspace slug.
 * Dev:  http://localhost:8083/w/:slug
 * Prod: https://:slug.portal.corely.one
 */
export function getPortalUrl(workspaceSlug: string | null | undefined): string | null {
  if (!workspaceSlug) {
    return null;
  }

  const portalBaseUrl =
    import.meta.env.VITE_PORTAL_BASE_URL ||
    (import.meta.env.DEV ? "http://localhost:8083" : "https://portal.corely.one");

  const baseUrl = new URL(portalBaseUrl);
  const canUseSubdomain = import.meta.env.PROD && baseUrl.hostname !== "localhost";

  if (canUseSubdomain) {
    return `${baseUrl.protocol}//${workspaceSlug}.${baseUrl.host}`;
  }

  return `${baseUrl.origin}/w/${workspaceSlug}`;
}
