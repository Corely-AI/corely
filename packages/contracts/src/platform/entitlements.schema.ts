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

export const AppPolicyForcedSchema = z.enum(["none", "on", "off"]);
export type AppPolicyForced = z.infer<typeof AppPolicyForcedSchema>;

export const AppVisibilityBlockerSchema = z.enum([
  "PLATFORM_APP_DISABLED",
  "NOT_INSTALLED",
  "INSTALL_DISABLED",
  "PLAN_NOT_ENTITLED",
  "HOST_DENIED",
  "HOST_FORCED_OFF",
  "TENANT_DISABLED",
]);
export type AppVisibilityBlocker = z.infer<typeof AppVisibilityBlockerSchema>;

export const EffectiveAppSourceSchema = z.enum(["plan", "default", "override"]);
export type EffectiveAppSource = z.infer<typeof EffectiveAppSourceSchema>;

export const EffectiveAppStateSchema = z.object({
  appId: z.string(),
  name: z.string(),
  tier: z.number(),
  isSystem: z.boolean(),
  install: z.object({
    installed: z.boolean(),
    enabled: z.boolean(),
  }),
  planEntitlement: z.object({
    enabled: z.boolean(),
    source: EffectiveAppSourceSchema,
  }),
  hostPolicy: z.object({
    allowed: z.boolean(),
    forced: AppPolicyForcedSchema,
  }),
  tenantSetting: z.object({
    enabled: z.boolean(),
    isEditable: z.boolean(),
  }),
  effective: z.object({
    visible: z.boolean(),
  }),
  blockers: z.array(AppVisibilityBlockerSchema),
});
export type EffectiveAppState = z.infer<typeof EffectiveAppStateSchema>;

export const EffectiveAppsResponseSchema = z.object({
  apps: z.array(EffectiveAppStateSchema),
  generatedAt: z.string(),
});
export type EffectiveAppsResponse = z.infer<typeof EffectiveAppsResponseSchema>;

export const UpdateAppPolicyInputSchema = z
  .object({
    allowed: z.boolean().optional(),
    forced: AppPolicyForcedSchema.optional(),
  })
  .refine((value) => value.allowed !== undefined || value.forced !== undefined, {
    message: "At least one field (allowed or forced) must be provided",
  });
export type UpdateAppPolicyInput = z.infer<typeof UpdateAppPolicyInputSchema>;

export const UpdateTenantAppSettingInputSchema = z.object({
  enabled: z.boolean(),
});
export type UpdateTenantAppSettingInput = z.infer<typeof UpdateTenantAppSettingInputSchema>;
