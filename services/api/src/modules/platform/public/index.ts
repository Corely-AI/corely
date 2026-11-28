// Narrow application API without eagerly loading the Platform module graph.
export { TenantEntitlementService } from "../application/services/tenant-entitlement.service";

export { EntitlementGuard, RequireApp, RequireCapability } from "../guards/entitlement.guard";

// Entitlement configuration reuses the owning installer and its audit transaction.
export { EnableAppUseCase } from "../application/use-cases/enable-app.usecase";
