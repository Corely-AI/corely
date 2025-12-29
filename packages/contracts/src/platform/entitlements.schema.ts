import { z } from "zod";

/**
 * Tenant Capabilities - Computed set of capabilities for a tenant
 */
export const TenantCapabilitiesSchema = z.object({
  tenantId: z.string(),
  enabledApps: z.array(z.string()).describe("App IDs enabled for this tenant"),
  capabilities: z.array(z.string()).describe("All capabilities from enabled apps"),
  computedAt: z.string().describe("ISO timestamp when capabilities were computed"),
});

export type TenantCapabilities = z.infer<typeof TenantCapabilitiesSchema>;

/**
 * User Entitlement - Combined tenant + user permissions
 */
export const UserEntitlementSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  enabledApps: z.array(z.string()).describe("Apps enabled for tenant"),
  capabilities: z.array(z.string()).describe("Capabilities from enabled apps"),
  permissions: z.array(z.string()).describe("User RBAC permissions"),
  computedAt: z.string().describe("ISO timestamp when entitlement was computed"),
});

export type UserEntitlement = z.infer<typeof UserEntitlementSchema>;
