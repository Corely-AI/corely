/**
 * @corely/api-ee - TenantRoutingService implementation
 *
 * In-memory implementation for tenant routing.
 * In production, this could be backed by Redis, database, or config service.
 */

import type { TenantRoutingService } from "./multi-tenant.resolver";

/**
 * Simple in-memory routing service for development and testing.
 * Maps tenant slugs and hostnames to tenant IDs.
 */
export class InMemoryTenantRoutingService implements TenantRoutingService {
  constructor(
    private readonly slugMap: Map<string, string> = new Map(),
    private readonly hostMap: Map<string, string> = new Map()
  ) {}

  async resolveSlug(slug: string): Promise<string | null> {
    return this.slugMap.get(slug) ?? null;
  }

  async resolveHost(host: string): Promise<string | null> {
    return this.hostMap.get(host) ?? null;
  }

  /**
   * Register a tenant slug -> ID mapping
   */
  registerSlug(slug: string, tenantId: string): void {
    this.slugMap.set(slug, tenantId);
  }

  /**
   * Register a hostname -> tenant ID mapping
   */
  registerHost(host: string, tenantId: string): void {
    this.hostMap.set(host, tenantId);
  }
}
