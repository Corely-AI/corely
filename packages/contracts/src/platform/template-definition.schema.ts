import { z } from "zod";

/**
 * Template Plan Action - Describes a single action to be performed
 */
export const TemplatePlanActionSchema = z.object({
  type: z.enum(["create", "update", "skip"]).describe("Action type"),
  table: z.string().describe("Target table name"),
  key: z.string().describe("Stable record key for idempotency"),
  data: z.record(z.any()).describe("Data to create/update"),
  reason: z.string().optional().describe("Reason for action (especially for skips)"),
});

export type TemplatePlanAction = z.infer<typeof TemplatePlanActionSchema>;

/**
 * Template Plan - Complete plan of actions to execute
 */
export const TemplatePlanSchema = z.object({
  actions: z.array(TemplatePlanActionSchema).describe("Ordered list of actions"),
  summary: z.string().describe("Human-readable summary of the plan"),
});

export type TemplatePlan = z.infer<typeof TemplatePlanSchema>;

/**
 * Template Result Summary - Result of applying a template
 */
export const TemplateResultSummarySchema = z.object({
  created: z.number().describe("Number of records created"),
  updated: z.number().describe("Number of records updated"),
  skipped: z.number().describe("Number of records skipped"),
  actions: z.array(TemplatePlanActionSchema).describe("All actions performed"),
});

export type TemplateResultSummary = z.infer<typeof TemplateResultSummarySchema>;

/**
 * Template Result - Complete result of template application
 */
export const TemplateResultSchema = z.object({
  summary: TemplateResultSummarySchema,
});

export type TemplateResult = z.infer<typeof TemplateResultSchema>;

/**
 * Template Upgrade Policy - Controls how template upgrades behave
 */
export const TemplateUpgradePolicySchema = z.object({
  skipCustomized: z
    .boolean()
    .default(true)
    .describe("Skip records that have been customized by tenant"),
  additiveOnly: z.boolean().default(false).describe("Only add new records, never update existing"),
});

export type TemplateUpgradePolicy = z.infer<typeof TemplateUpgradePolicySchema>;

/**
 * Template Definition - Complete template metadata
 */
export const TemplateDefinitionSchema = z.object({
  templateId: z.string().describe("Stable unique template identifier"),
  name: z.string().describe("Human-readable template name"),
  category: z.string().describe("Template category (accounting, tax, inventory, etc.)"),
  version: z.string().describe("Semantic version"),
  description: z.string().optional().describe("Template description"),
  requiresApps: z.array(z.string()).describe("Required app IDs"),
  paramsSchema: z.any().describe("JSON Schema for template parameters"),
  upgradePolicy: TemplateUpgradePolicySchema,
});

export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;

/**
 * Template Catalog Item - Lightweight template listing item
 */
export const TemplateCatalogItemSchema = z.object({
  templateId: z.string(),
  name: z.string(),
  category: z.string(),
  version: z.string(),
  description: z.string().optional(),
  requiresApps: z.array(z.string()),
  appliedVersion: z
    .string()
    .optional()
    .describe("Version currently applied (only in tenant context)"),
});

export type TemplateCatalogItem = z.infer<typeof TemplateCatalogItemSchema>;

/**
 * Tenant Template Install - Tenant-specific template installation record
 */
export const TenantTemplateInstallSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  templateId: z.string(),
  version: z.string(),
  paramsJson: z.string(),
  appliedByUserId: z.string().nullable(),
  appliedAt: z.date(),
  resultSummaryJson: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TenantTemplateInstall = z.infer<typeof TenantTemplateInstallSchema>;

/**
 * Plan Template Input
 */
export const PlanTemplateInputSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  params: z.record(z.any()).describe("Template parameters"),
});

export type PlanTemplateInput = z.infer<typeof PlanTemplateInputSchema>;

/**
 * Apply Template Input
 */
export const ApplyTemplateInputSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  params: z.record(z.any()).describe("Template parameters"),
});

export type ApplyTemplateInput = z.infer<typeof ApplyTemplateInputSchema>;
