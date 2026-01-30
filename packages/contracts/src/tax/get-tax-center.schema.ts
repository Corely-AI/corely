import { z } from "zod";
import { TaxFilingDtoSchema } from "./tax-filing.types";

export const TaxIssueSchema = z.object({
  id: z.string(),
  kind: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  count: z.number().int(),
  title: z.string(),
  description: z.string(),
  deepLink: z.string(),
  blocking: z.boolean(),
});
export type TaxIssue = z.infer<typeof TaxIssueSchema>;

export const TaxSnapshotKpiSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().int(),
  currency: z.string(),
  trend: z.number().optional(), // percentage change
});
export type TaxSnapshotKpi = z.infer<typeof TaxSnapshotKpiSchema>;

export const GetTaxCenterInputSchema = z.object({
  year: z.coerce.number().int().optional(),
  annualYear: z.coerce.number().int().optional(),
  entityId: z.string().optional(),
});
export type GetTaxCenterInput = z.infer<typeof GetTaxCenterInputSchema>;

export const TaxModeSchema = z.enum(["FREELANCER", "COMPANY"]);
export type TaxMode = z.infer<typeof TaxModeSchema>;

export const TaxFilingSummarySchema = TaxFilingDtoSchema.pick({
  id: true,
  type: true,
  periodLabel: true,
  dueDate: true,
  status: true,
  amountCents: true,
  currency: true,
});
export type TaxFilingSummary = z.infer<typeof TaxFilingSummarySchema>;

export const TaxSnapshotSchema = z.object({
  kpis: z.array(TaxSnapshotKpiSchema),
  updatedAt: z.string().datetime(),
});
export type TaxSnapshot = z.infer<typeof TaxSnapshotSchema>;

export const TaxCenterAnnualSchema = z.object({
  year: z.number().int(),
  items: z.array(TaxFilingSummarySchema),
  totalCount: z.number().int(),
});
export type TaxCenterAnnual = z.infer<typeof TaxCenterAnnualSchema>;

export const GetTaxCenterOutputSchema = z.object({
  mode: TaxModeSchema,
  year: z.number().int(),
  nextUp: TaxFilingSummarySchema.nullable(),
  annual: TaxCenterAnnualSchema,
  issues: z.array(TaxIssueSchema),
  snapshot: TaxSnapshotSchema,
  shortcutsHints: z.array(z.string()),
});
export type GetTaxCenterOutput = z.infer<typeof GetTaxCenterOutputSchema>;
