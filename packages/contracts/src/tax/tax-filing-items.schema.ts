import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";

export const TaxFilingItemSourceTypeSchema = z.enum(["income", "expense", "transaction"]);
export type TaxFilingItemSourceType = z.infer<typeof TaxFilingItemSourceTypeSchema>;

export const TaxFilingItemsListQuerySchema = ListQuerySchema.extend({
  sourceType: TaxFilingItemSourceTypeSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
  needsAttention: z.coerce.boolean().optional(),
  missingMapping: z.coerce.boolean().optional(),
});
export type TaxFilingItemsListQuery = z.infer<typeof TaxFilingItemsListQuerySchema>;

export const TaxFilingItemRowSchema = z.object({
  id: z.string(),
  sourceType: TaxFilingItemSourceTypeSchema,
  sourceId: z.string(),
  date: z.string().datetime(),
  counterparty: z.string().optional(),
  description: z.string().optional(),
  netCents: z.number().int().optional().nullable(),
  taxCents: z.number().int().optional().nullable(),
  grossCents: z.number().int().optional().nullable(),
  missingCategory: z.boolean().optional(),
  missingTaxTreatment: z.boolean().optional(),
  deepLink: z.string(),
});
export type TaxFilingItemRow = z.infer<typeof TaxFilingItemRowSchema>;

export const TaxFilingItemsListResponseSchema = createListResponseSchema(TaxFilingItemRowSchema);
export type TaxFilingItemsListResponse = z.infer<typeof TaxFilingItemsListResponseSchema>;
