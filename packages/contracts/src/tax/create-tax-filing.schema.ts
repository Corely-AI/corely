import { z } from "zod";
import { TaxFilingTypeSchema } from "./tax-filing.types";

export const CreateTaxFilingInputSchema = z.object({
  type: TaxFilingTypeSchema, // e.g. "VAT"
  year: z.number().int(),
  periodKey: z.string().optional(), // Required for VAT, e.g. "2026-Q1"
  entityId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});
export type CreateTaxFilingInput = z.infer<typeof CreateTaxFilingInputSchema>;

export const CreateTaxFilingOutputSchema = z.object({
  id: z.string(),
});
export type CreateTaxFilingOutput = z.infer<typeof CreateTaxFilingOutputSchema>;
