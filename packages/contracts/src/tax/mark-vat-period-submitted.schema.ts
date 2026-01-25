import { z } from "zod";
import { TaxReportDtoSchema } from "./tax.types";

export const MarkVatPeriodSubmittedInputSchema = z.object({
  submissionDate: z.string().datetime().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const MarkVatPeriodSubmittedOutputSchema = z.object({
  report: TaxReportDtoSchema,
});

export type MarkVatPeriodSubmittedInput = z.infer<typeof MarkVatPeriodSubmittedInputSchema>;
export type MarkVatPeriodSubmittedOutput = z.infer<typeof MarkVatPeriodSubmittedOutputSchema>;
