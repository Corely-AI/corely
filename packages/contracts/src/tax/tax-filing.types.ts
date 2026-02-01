import { z } from "zod";

export const TaxPeriodKeySchema = z.string().regex(/^(\d{4})-(0[1-9]|1[0-2]|Q[1-4])$/);
export type TaxPeriodKey = z.infer<typeof TaxPeriodKeySchema>;

export const TaxFilingTypeSchema = z.enum([
  "vat",
  "vat-annual",
  "income-annual",
  "trade",
  "payroll",
  "corporate-annual",
  "year-end",
  "other",
]);
export type TaxFilingType = z.infer<typeof TaxFilingTypeSchema>;

export const TaxFilingStatusSchema = z.enum([
  "draft",
  "needsFix",
  "readyForReview",
  "submitted",
  "paid",
  "archived",
]);
export type TaxFilingStatus = z.infer<typeof TaxFilingStatusSchema>;

export const TaxFilingSummarySchema = z.object({
  id: z.string(),
  type: TaxFilingTypeSchema,
  periodLabel: z.string(), // e.g., "Q1 2026" or "Jan 2026"
  periodKey: TaxPeriodKeySchema.optional(),
  year: z.number().int().optional(),
  dueDate: z.string().datetime(),
  status: TaxFilingStatusSchema,
  amountCents: z.number().int().nullable(),
  currency: z.string().optional(),
});
export type TaxFilingSummary = z.infer<typeof TaxFilingSummarySchema>;

export const TaxFilingDtoSchema = TaxFilingSummarySchema.extend({
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  entityId: z.string().optional(),
  metadata: z.record(z.any()).optional(),

  // Actions allowed (frontend helper)
  allowedActions: z.array(z.string()).default([]),
});
export type TaxFilingDto = z.infer<typeof TaxFilingDtoSchema>;
