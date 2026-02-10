export const TENANT_ENTITLEMENTS_READ_PORT_TOKEN = Symbol("TenantEntitlementsReadPort");

/**
 * Port for reading effective tenant entitlements (features/apps)
 * Used to cross module boundaries without direct table access.
 */
export interface TenantEntitlementsReadPort {
  /**
   * Get a map of enabled apps for a tenant.
   * Key is appId, value is boolean (true = enabled).
   * Result includes overrides and default values.
   */
  getAppEnablementMap(tenantId: string): Promise<Record<string, boolean>>;

  /**
   * Check if a specific app is enabled for a tenant.
   */
  isAppEnabled(tenantId: string, appId: string): Promise<boolean>;
}
