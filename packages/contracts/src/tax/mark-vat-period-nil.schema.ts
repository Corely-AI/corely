import { z } from "zod";
import { TaxReportDtoSchema } from "./tax.types";

export const MarkVatPeriodNilInputSchema = z.object({
  submissionDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const MarkVatPeriodNilOutputSchema = z.object({
  report: TaxReportDtoSchema,
});

export type MarkVatPeriodNilInput = z.infer<typeof MarkVatPeriodNilInputSchema>;
export type MarkVatPeriodNilOutput = z.infer<typeof MarkVatPeriodNilOutputSchema>;
