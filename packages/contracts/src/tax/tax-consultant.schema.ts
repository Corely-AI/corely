import { z } from "zod";
import { TaxConsultantDtoSchema } from "./tax.types";

export const UpsertTaxConsultantInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpsertTaxConsultantOutputSchema = z.object({
  consultant: TaxConsultantDtoSchema,
});

export const GetTaxConsultantOutputSchema = z.object({
  consultant: TaxConsultantDtoSchema.optional().nullable(),
});

export type UpsertTaxConsultantInput = z.infer<typeof UpsertTaxConsultantInputSchema>;
export type UpsertTaxConsultantOutput = z.infer<typeof UpsertTaxConsultantOutputSchema>;
export type GetTaxConsultantOutput = z.infer<typeof GetTaxConsultantOutputSchema>;
