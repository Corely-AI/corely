/**
 * @corely/api-ee
 * Enterprise Edition backend module
 *
 * This package contains EE-only backend features:
 * - MultiTenantResolver: resolves tenants from routes, hosts, and headers
 * - TenantRoutingService: manages tenant slug/host mappings
 * - (Future) Tenant provisioning APIs
 * - (Future) Tenant admin controllers
 */

export {
  MultiTenantResolver,
  TenantNotResolvedError,
  type TenantResolver,
  type TenantResolution,
  type TenantResolutionSource,
} from "./tenancy/multi-tenant.resolver";
export { InMemoryTenantRoutingService } from "./tenancy/routing.service";
export type { TenantRoutingService } from "./tenancy/multi-tenant.resolver";
