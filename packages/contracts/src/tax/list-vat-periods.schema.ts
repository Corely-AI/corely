import { z } from "zod";
import { VatPeriodSummaryDtoSchema, VatPeriodTypeSchema } from "./tax.types";

/**
 * List VAT Periods
 * Retrieves all VAT period summaries with optional date filtering
 */
export const ListVatPeriodsInputSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  year: z.number().int().optional(),
  type: VatPeriodTypeSchema.optional(),
});

export const ListVatPeriodsOutputSchema = z.object({
  periods: z.array(VatPeriodSummaryDtoSchema),
});

export type ListVatPeriodsInput = z.infer<typeof ListVatPeriodsInputSchema>;
export type ListVatPeriodsOutput = z.infer<typeof ListVatPeriodsOutputSchema>;
