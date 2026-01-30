import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import {
  TaxFilingSummarySchema,
  TaxFilingTypeSchema,
  TaxFilingStatusSchema,
  TaxPeriodKeySchema,
} from "./tax-filing.types";

export const TaxFilingsListQuerySchema = ListQuerySchema.extend({
  type: TaxFilingTypeSchema.optional(),
  status: TaxFilingStatusSchema.optional(),
  year: z.coerce.number().int().optional(),
  periodKey: TaxPeriodKeySchema.optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  needsAttention: z.coerce.boolean().optional(),
  hasIssues: z.coerce.boolean().optional(),
  entityId: z.string().optional(),
});
export type TaxFilingsListQuery = z.infer<typeof TaxFilingsListQuerySchema>;

export const TaxFilingsListResponseSchema = createListResponseSchema(TaxFilingSummarySchema);
export type TaxFilingsListResponse = z.infer<typeof TaxFilingsListResponseSchema>;

export const ListTaxFilingsInputSchema = TaxFilingsListQuerySchema;
export type ListTaxFilingsInput = TaxFilingsListQuery;

export const ListTaxFilingsOutputSchema = TaxFilingsListResponseSchema;
export type ListTaxFilingsOutput = TaxFilingsListResponse;
