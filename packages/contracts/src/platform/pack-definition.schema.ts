import { z } from "zod";

/**
 * Pack Template Spec - Template to apply as part of pack installation
 */
export const PackTemplateSpecSchema = z.object({
  templateId: z.string().describe("Template ID to apply"),
  versionRange: z.string().optional().describe("Acceptable version range (semver)"),
  defaultParams: z.record(z.any()).describe("Default parameters for template"),
});

export type PackTemplateSpec = z.infer<typeof PackTemplateSpecSchema>;

/**
 * Pack Definition - Complete pack metadata
 */
export const PackDefinitionSchema = z.object({
  packId: z.string().describe("Stable unique pack identifier"),
  name: z.string().describe("Human-readable pack name"),
  version: z.string().describe("Semantic version"),
  description: z.string().optional().describe("Pack description"),
  appsToEnable: z.array(z.string()).describe("App IDs to enable (in order)"),
  templatesToApply: z.array(PackTemplateSpecSchema).describe("Templates to apply (in order)"),
  featureFlags: z.record(z.any()).optional().describe("Feature flag preset"),
  menuPresetTemplateId: z.string().optional().describe("Menu preset template ID"),
  postInstallChecks: z.array(z.string()).optional().describe("Post-install validation checks"),
});

export type PackDefinition = z.infer<typeof PackDefinitionSchema>;

/**
 * Pack Catalog Item - Lightweight pack listing item
 */
export const PackCatalogItemSchema = z.object({
  packId: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  appsToEnable: z.array(z.string()),
  installedVersion: z
    .string()
    .optional()
    .describe("Version currently installed (only in tenant context)"),
});

export type PackCatalogItem = z.infer<typeof PackCatalogItemSchema>;

/**
 * Pack Install Status
 */
export const PackInstallStatusSchema = z.enum(["PENDING", "RUNNING", "FAILED", "COMPLETED"]);

export type PackInstallStatus = z.infer<typeof PackInstallStatusSchema>;

/**
 * Pack Install Log Entry
 */
export const PackInstallLogEntrySchema = z.object({
  step: z.string().describe("Installation step (apps, templates, menu, checks)"),
  message: z.string().describe("Log message"),
  timestamp: z.date().describe("When this log entry was created"),
  level: z.enum(["info", "warn", "error"]).optional().default("info"),
});

export type PackInstallLogEntry = z.infer<typeof PackInstallLogEntrySchema>;

/**
 * Tenant Pack Install - Tenant-specific pack installation record
 */
export const TenantPackInstallSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  packId: z.string(),
  version: z.string(),
  status: PackInstallStatusSchema,
  paramsJson: z.string().nullable(),
  logJson: z.string().describe("JSON array of log entries"),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  installedByUserId: z.string().nullable(),
  errorJson: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TenantPackInstall = z.infer<typeof TenantPackInstallSchema>;

/**
 * Install Pack Input
 */
export const InstallPackInputSchema = z.object({
  packId: z.string().min(1, "Pack ID is required"),
  params: z.record(z.any()).optional().describe("Pack installation parameters"),
});

export type InstallPackInput = z.infer<typeof InstallPackInputSchema>;

/**
 * Install Pack Response
 */
export const InstallPackResponseSchema = z.object({
  installId: z.string().describe("Installation job ID for tracking progress"),
  packId: z.string(),
  version: z.string(),
  status: PackInstallStatusSchema,
});

export type InstallPackResponse = z.infer<typeof InstallPackResponseSchema>;

/**
 * Get Pack Install Status Response
 */
export const GetPackInstallStatusResponseSchema = z.object({
  installId: z.string(),
  packId: z.string(),
  version: z.string(),
  status: PackInstallStatusSchema,
  logs: z.array(PackInstallLogEntrySchema),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  error: z.string().nullable(),
});

export type GetPackInstallStatusResponse = z.infer<typeof GetPackInstallStatusResponseSchema>;
