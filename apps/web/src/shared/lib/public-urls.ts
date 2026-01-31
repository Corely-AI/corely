/**
 * Utilities for generating public workspace URLs in local development
 * and production environments.
 */

/**
 * Generate a public URL for a rental property.
 * In local development, uses path-based routing: /w/:workspaceSlug/public/rentals/properties/:slug
 * In production with custom domain/subdomain, uses: /public/rentals/properties/:slug
 *
 * Note: The shorthand routes like /rental/:slug or /stay/:slug are handled by frontend routing only.
 * For API calls and server-side resolution, always use the full /public/rentals/properties/:slug path.
 */
export function getPublicRentalUrl(propertySlug: string, workspaceSlug?: string): string {
  // Check if we're in local development (localhost or .local domains)
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname.endsWith(".local") ||
    window.location.hostname === "127.0.0.1";

  // If local and we have a workspace slug, use path-based routing with /public prefix
  if (isLocal && workspaceSlug) {
    return `/w/${workspaceSlug}/rental/${propertySlug}`;
  }

  // Otherwise, use the shorthand frontend route (works with custom domains/subdomains)
  return `/stay/${propertySlug}`;
}

/**
 * Generate a public URL for a CMS post.
 * In local development, uses path-based routing: /w/:workspaceSlug/cms/:slug
 * In production with custom domain/subdomain, uses: /cms/:slug or /p/:slug
 */
export function getPublicCmsUrl(postSlug: string, workspaceSlug?: string): string {
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname.endsWith(".local") ||
    window.location.hostname === "127.0.0.1";

  if (isLocal && workspaceSlug) {
    return `/w/${workspaceSlug}/cms/${postSlug}`;
  }

  return `/p/${postSlug}`;
}
