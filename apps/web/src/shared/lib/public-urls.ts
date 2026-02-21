/**
 * Utilities for generating public workspace URLs in local development
 * and production environments.
 */

/**
 * Generate a public URL for a rental property.
 * In local development, uses path-based routing: /w/:workspaceSlug/rentals/:slug
 * In production, prefers subdomain routing: https://:workspaceSlug.<rootDomain>/rentals/:slug
 * Falls back to path-based routing if a root domain is not available.
 */
export function getPublicRentalUrl(propertySlug: string, workspaceSlug?: string): string {
  const publicWebBaseUrl =
    import.meta.env.VITE_PUBLIC_WEB_BASE_URL ||
    (import.meta.env.DEV ? "http://localhost:8082" : "https://my.corely.one");

  const baseUrl = new URL(publicWebBaseUrl);
  const rootDomain = import.meta.env.VITE_PUBLIC_ROOT_DOMAIN || baseUrl.hostname;
  const canUseSubdomain =
    import.meta.env.PROD && Boolean(workspaceSlug) && baseUrl.hostname === rootDomain;

  const origin = canUseSubdomain
    ? `${baseUrl.protocol}//${workspaceSlug}.${rootDomain}`
    : baseUrl.origin;
  const path = canUseSubdomain
    ? `/rentals/${propertySlug}`
    : workspaceSlug
      ? `/w/${workspaceSlug}/rentals/${propertySlug}`
      : `/rentals/${propertySlug}`;

  return new URL(path, origin).toString();
}

/**
 * Generate a public URL for a CMS post.
 * In local development, uses path-based routing: /w/:workspaceSlug/cms/:slug
 * In production with custom domain/subdomain, uses: /cms/:slug or /p/:slug
 */
export function getPublicCmsUrl(postSlug: string, workspaceSlug?: string): string {
  if (workspaceSlug) {
    return `/w/${workspaceSlug}/cms/${postSlug}`;
  }

  return `/p/${postSlug}`;
}

/**
 * Generate a public URL for a website page.
 * When a custom domain is provided, use it directly.
 * When no domain is provided, fall back to path-based routing:
 * - Default site root: /w/:workspaceSlug
 * - Other pages/sites: /w/:workspaceSlug/:websiteSlug
 *
 * Runtime host resolution:
 * - Uses `VITE_WEBSITE_RUNTIME_BASE_URL` when provided.
 * - In local development, defaults to `http://localhost:8084` (website runtime app).
 * - In production, falls back to `VITE_PUBLIC_WEB_BASE_URL` for backward compatibility.
 */
export function getPublicWebsiteUrl(input: {
  hostname?: string | null;
  workspaceSlug?: string | null;
  websiteSlug?: string | null;
  isDefault?: boolean;
  path?: string;
}): string | null {
  const normalizedPath = input.path?.startsWith("/") ? input.path : `/${input.path ?? ""}`;
  const normalizedSlug = input.websiteSlug?.trim() ?? "";
  const slugLower = normalizedSlug.toLowerCase();
  const hasValidSlug = Boolean(normalizedSlug) && slugLower !== "undefined" && slugLower !== "null";

  if (input.hostname) {
    const origin = input.hostname.startsWith("http") ? input.hostname : `https://${input.hostname}`;
    return new URL(normalizedPath === "/" ? "/" : normalizedPath, origin).toString();
  }

  if (!input.workspaceSlug && !input.hostname) {
    return null;
  }

  const websiteRuntimeBaseUrl = import.meta.env.VITE_WEBSITE_RUNTIME_BASE_URL
    ? import.meta.env.VITE_WEBSITE_RUNTIME_BASE_URL
    : import.meta.env.DEV
      ? "http://localhost:8084"
      : import.meta.env.VITE_PUBLIC_WEB_BASE_URL || "https://my.corely.one";
  const baseUrl = new URL(websiteRuntimeBaseUrl);
  const rootDomain = import.meta.env.VITE_PUBLIC_ROOT_DOMAIN || baseUrl.hostname;
  const canUseSubdomain =
    import.meta.env.PROD && Boolean(input.workspaceSlug) && baseUrl.hostname === rootDomain;

  const origin = canUseSubdomain
    ? `${baseUrl.protocol}//${input.workspaceSlug}.${rootDomain}`
    : baseUrl.origin;
  const pathSuffix = normalizedPath === "/" ? "" : normalizedPath;

  if (!canUseSubdomain) {
    if (input.isDefault && normalizedPath === "/") {
      return new URL(`/w/${input.workspaceSlug}`, origin).toString();
    }
    if (!hasValidSlug) {
      return null;
    }
    return new URL(`/w/${input.workspaceSlug}/${normalizedSlug}${pathSuffix}`, origin).toString();
  }

  if (input.isDefault) {
    return new URL(normalizedPath, origin).toString();
  }

  if (!hasValidSlug) {
    return null;
  }
  return new URL(`/${normalizedSlug}${pathSuffix}`, origin).toString();
}
