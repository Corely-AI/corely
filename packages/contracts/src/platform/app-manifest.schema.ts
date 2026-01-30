import { z } from "zod";

/**
 * Menu Contribution - Defines a menu item contributed by an app
 */
export const MenuContributionSchema = z.object({
  id: z.string().describe("Stable unique identifier for this menu item"),
  scope: z.enum(["web", "pos", "both"]).describe("Which UI scope this item appears in"),
  section: z.string().describe("Section/category (finance, ops, sales, admin, settings, etc.)"),
  labelKey: z.string().describe("i18n translation key"),
  defaultLabel: z.string().describe("Default label if translation not available"),
  route: z.string().optional().describe("Web app route path"),
  screen: z.string().optional().describe("POS screen identifier"),
  icon: z.string().describe("Icon identifier (e.g., FileText, Users, Package)"),
  order: z.number().describe("Display order within section (lower = earlier)"),
  requiresApps: z.array(z.string()).optional().describe("Required app IDs"),
  requiresCapabilities: z.array(z.string()).optional().describe("Required capability strings"),
  requiresPermissions: z.array(z.string()).optional().describe("Required RBAC permission keys"),
  tags: z.array(z.string()).optional().describe("Search tags"),
  exact: z.boolean().optional().describe("Match route exactly"),
});

export type MenuContribution = z.infer<typeof MenuContributionSchema>;

/**
 * App Manifest - Complete definition of an app/module
 */
export const AppManifestSchema = z.object({
  appId: z.string().describe('Stable unique app identifier (e.g., "invoices", "inventory")'),
  name: z.string().describe("Human-readable app name"),
  tier: z.number().min(0).max(7).describe("Complexity tier (0-7, where 0 is simplest)"),
  version: z.string().describe('Semantic version (e.g., "1.0.0")'),
  description: z.string().optional().describe("App description"),
  dependencies: z.array(z.string()).describe("App IDs this app depends on"),
  capabilities: z
    .array(z.string())
    .describe("Fine-grained capability strings provided by this app"),
  permissions: z.array(z.string()).describe("RBAC permission keys used by this app"),
  menu: z.array(MenuContributionSchema).describe("Menu contributions from this app"),
  settingsSchema: z.any().optional().describe("JSON Schema for tenant-specific app settings"),
});

export type AppManifest = z.infer<typeof AppManifestSchema>;

/**
 * App Catalog Item - Lightweight app listing item
 */
export const AppCatalogItemSchema = z.object({
  appId: z.string(),
  name: z.string(),
  tier: z.number(),
  version: z.string(),
  description: z.string().optional(),
  dependencies: z.array(z.string()),
  enabled: z.boolean().optional().describe("Enabled status (only in tenant context)"),
});

export type AppCatalogItem = z.infer<typeof AppCatalogItemSchema>;

/**
 * Tenant App Install - Tenant-specific app installation record
 */
export const TenantAppInstallSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  appId: z.string(),
  enabled: z.boolean(),
  installedVersion: z.string(),
  configJson: z.string().nullable(),
  enabledAt: z.date().nullable(),
  enabledByUserId: z.string().nullable(),
  disabledAt: z.date().nullable(),
  disabledByUserId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TenantAppInstall = z.infer<typeof TenantAppInstallSchema>;

/**
 * Enable App Input
 */
export const EnableAppInputSchema = z.object({
  appId: z.string().min(1, "App ID is required"),
});

export type EnableAppInput = z.infer<typeof EnableAppInputSchema>;

/**
 * Disable App Input
 */
export const DisableAppInputSchema = z.object({
  appId: z.string().min(1, "App ID is required"),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe("Force disable even if other apps depend on it"),
});

export type DisableAppInput = z.infer<typeof DisableAppInputSchema>;

/**
 * Enable App Response
 */
export const EnableAppResponseSchema = z.object({
  appId: z.string(),
  enabledDependencies: z.array(z.string()).describe("Dependencies that were also enabled"),
});

export type EnableAppResponse = z.infer<typeof EnableAppResponseSchema>;
