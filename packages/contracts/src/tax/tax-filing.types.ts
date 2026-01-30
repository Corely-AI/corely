import { z } from "zod";

export const TaxFilingTypeSchema = z.enum([
  "VAT",
  "VAT_ANNUAL",
  "INCOME_TAX",
  "INCOME_TAX_ANNUAL",
  "PAYROLL",
  "YEAR_END",
  "CORPORATE",
  "CORPORATE_ANNUAL",
  "TRADE",
  "OTHER",
]);
export type TaxFilingType = z.infer<typeof TaxFilingTypeSchema>;

export const TaxFilingStatusSchema = z.enum([
  "DRAFT",
  "NEEDS_FIX",
  "READY_FOR_REVIEW",
  "REVIEWED",
  "APPROVED",
  "SUBMITTED",
  "PAID",
  "ARCHIVED",
  "OVERDUE",
]);
export type TaxFilingStatus = z.infer<typeof TaxFilingStatusSchema>;

export const TaxFilingDtoSchema = z.object({
  id: z.string(),
  type: TaxFilingTypeSchema,
  periodLabel: z.string(), // e.g., "Q1 2026" or "Jan 2026"
  periodKey: z.string().optional(), // e.g., "2026-Q1" or "2026-01"
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  dueDate: z.string().datetime(),
  status: TaxFilingStatusSchema,
  amountCents: z.number().int().nullable(),
  currency: z.string(),
  entityId: z.string().optional(),
  metadata: z.record(z.any()).optional(),

  // Actions allowed (frontend helper)
  allowedActions: z.array(z.string()).default([]),
});
export type TaxFilingDto = z.infer<typeof TaxFilingDtoSchema>;
