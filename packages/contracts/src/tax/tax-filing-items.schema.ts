import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";

export const TaxFilingItemSourceTypeSchema = z.enum([
  "invoice",
  "expense",
  "tx",
  // Legacy aliases kept for compatibility during migration.
  "income",
  "transaction",
]);
export type TaxFilingItemSourceType = z.infer<typeof TaxFilingItemSourceTypeSchema>;

export const TaxFilingItemsListQuerySchema = ListQuerySchema.extend({
  sourceType: TaxFilingItemSourceTypeSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  vatTreatment: z.string().optional(),
  category: z.string().optional(),
  needsAttention: z.coerce.boolean().optional(),
  // Legacy alias for "missingTaxTreatment".
  missingMapping: z.coerce.boolean().optional(),
});
export type TaxFilingItemsListQuery = z.infer<typeof TaxFilingItemsListQuerySchema>;

export const TaxFilingItemFlagsSchema = z.object({
  needsAttention: z.boolean(),
  missingCategory: z.boolean(),
  missingTaxTreatment: z.boolean(),
});
export type TaxFilingItemFlags = z.infer<typeof TaxFilingItemFlagsSchema>;

export const TaxFilingItemRowSchema = z.object({
  id: z.string(),
  sourceType: TaxFilingItemSourceTypeSchema,
  sourceId: z.string(),
  date: z.string().datetime(),
  counterparty: z.string().optional(),
  category: z.string().optional(),
  vatTreatment: z.string().optional(),
  netCents: z.number().int().optional().nullable(),
  taxCents: z.number().int().optional().nullable(),
  grossCents: z.number().int().optional().nullable(),
  // Aliases for consumers expecting generic names.
  net: z.number().int().optional().nullable(),
  vat: z.number().int().optional().nullable(),
  gross: z.number().int().optional().nullable(),
  flags: TaxFilingItemFlagsSchema,
  description: z.string().optional(),
  missingCategory: z.boolean().optional(),
  missingTaxTreatment: z.boolean().optional(),
  deepLink: z.string(),
});
export type TaxFilingItemRow = z.infer<typeof TaxFilingItemRowSchema>;

export const TaxFilingItemsListResponseSchema = createListResponseSchema(TaxFilingItemRowSchema);
export type TaxFilingItemsListResponse = z.infer<typeof TaxFilingItemsListResponseSchema>;
