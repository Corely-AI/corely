import { z } from "zod";
import { TaxFilingDtoSchema, TaxFilingTypeSchema, TaxFilingStatusSchema } from "./tax-filing.types";

export const ListTaxFilingsInputSchema = z.object({
  q: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  filters: z.string().optional(), // JSON string for advanced filters or standard filters

  // Direct filters
  type: TaxFilingTypeSchema.optional(),
  status: TaxFilingStatusSchema.optional(),
  year: z.coerce.number().int().optional(),
  periodKey: z.string().optional(),
  entityId: z.string().optional(),
});
export type ListTaxFilingsInput = z.infer<typeof ListTaxFilingsInputSchema>;

export const ListTaxFilingsOutputSchema = z.object({
  items: z.array(TaxFilingDtoSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});
export type ListTaxFilingsOutput = z.infer<typeof ListTaxFilingsOutputSchema>;
