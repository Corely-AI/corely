// Narrow application API without eagerly loading the Platform module graph.
export { TenantEntitlementService } from "../application/services/tenant-entitlement.service";

export { EntitlementGuard, RequireApp, RequireCapability } from "../guards/entitlement.guard";
