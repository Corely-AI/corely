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
  // If we have a workspace slug, use path-based routing: /w/:workspaceSlug/rental/:slug
  // This ensures the workspace context is preserved in all environments
  if (workspaceSlug) {
    return `/w/${workspaceSlug}/rental/${propertySlug}`;
  }

  // Otherwise, fallback to the shorthand route (requires implicit workspace context or separate handling)
  return `/stay/${propertySlug}`;
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
