import { z } from "zod";
import { TaxFilingTypeSchema, TaxPeriodKeySchema } from "./tax-filing.types";

export const CreateTaxFilingInputSchema = z
  .object({
    type: TaxFilingTypeSchema, // e.g. "vat"
    year: z.number().int().optional(),
    periodKey: TaxPeriodKeySchema.optional(), // Required for vat, e.g. "2026-Q1"
    entityId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })
  .refine((data) => (data.type === "vat" ? !!data.periodKey : true), {
    message: "periodKey is required for VAT filings",
    path: ["periodKey"],
  })
  .refine((data) => (data.type !== "vat" ? typeof data.year === "number" : true), {
    message: "year is required for annual filings",
    path: ["year"],
  });
export type CreateTaxFilingInput = z.infer<typeof CreateTaxFilingInputSchema>;

export const CreateTaxFilingOutputSchema = z.object({
  id: z.string(),
});
export type CreateTaxFilingOutput = z.infer<typeof CreateTaxFilingOutputSchema>;
