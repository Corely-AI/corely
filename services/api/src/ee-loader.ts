/**
 * EE Bridge Loader for Backend (services/api)
 *
 * This is the ONLY file allowed to import from @corely/api-ee.
 * All EE functionality must be loaded through this bridge.
 *
 * CRITICAL: This file uses dynamic imports to ensure OSS can build without EE packages.
 */

/**
 * Load EE tenancy module exports
 * Returns MultiTenantResolver, InMemoryTenantRoutingService, etc.
 *
 * @throws Error if EE package is not available (EDITION !== "ee" or package not installed)
 */
export async function loadEeTenancy() {
  try {
    // Dynamic import ensures this only fails at runtime, not build time
    const mod = await import(/* @vite-ignore */ "@corely/api-ee");
    return {
      MultiTenantResolver: mod.MultiTenantResolver,
      InMemoryTenantRoutingService: mod.InMemoryTenantRoutingService,
      TenantNotResolvedError: mod.TenantNotResolvedError,
    };
  } catch (error) {
    throw new Error(
      `Failed to load @corely/api-ee. Ensure EE packages are installed and EDITION=ee is set. ${(error as Error).message}`
    );
  }
}

/**
 * Check if EE packages are available
 * Useful for graceful degradation
 */
export async function isEeAvailable(): Promise<boolean> {
  try {
    await import(/* @vite-ignore */ "@corely/api-ee");
    return true;
  } catch {
    return false;
  }
}
