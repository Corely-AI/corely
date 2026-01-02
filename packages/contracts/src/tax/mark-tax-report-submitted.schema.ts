import { z } from "zod";
import { TaxReportDtoSchema } from "./tax.types";

export const MarkTaxReportSubmittedOutputSchema = z.object({
  report: TaxReportDtoSchema,
});

export type MarkTaxReportSubmittedOutput = z.infer<typeof MarkTaxReportSubmittedOutputSchema>;
