import { z } from "zod";
import { TaxFilingStatusSchema, TaxPeriodKeySchema } from "./tax-filing.types";

export const VatFrequencySchema = z.enum(["monthly", "quarterly"]);
export type VatFrequency = z.infer<typeof VatFrequencySchema>;

export const TaxPeriodKindSchema = z.enum(["month", "quarter"]);
export type TaxPeriodKind = z.infer<typeof TaxPeriodKindSchema>;

export const VatPeriodItemSchema = z.object({
  periodKey: TaxPeriodKeySchema,
  label: z.string(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  dueDate: z.string().datetime().nullable(),
  filingId: z.string().nullable(),
  status: TaxFilingStatusSchema.nullable(),
});
export type VatPeriodItem = z.infer<typeof VatPeriodItemSchema>;

export const GetVatPeriodsInputSchema = z.object({
  year: z.coerce.number().int(), // Required
  entityId: z.string().optional(),
});
export type GetVatPeriodsInput = z.infer<typeof GetVatPeriodsInputSchema>;

export const GetVatPeriodsOutputSchema = z.object({
  year: z.number().int(),
  frequency: VatFrequencySchema,
  periods: z.array(VatPeriodItemSchema),
});
export type GetVatPeriodsOutput = z.infer<typeof GetVatPeriodsOutputSchema>;

export const VatPeriodsResponseSchema = GetVatPeriodsOutputSchema;
export type VatPeriodsResponse = GetVatPeriodsOutput;
