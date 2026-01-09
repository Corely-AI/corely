import { z } from "zod";
import { TaxReportPreviewSchema, TaxSummaryDtoSchema } from "./tax.types";

export const GetTaxSummaryOutputSchema = TaxSummaryDtoSchema.extend({
  upcomingReportsPreview: z.array(TaxReportPreviewSchema).max(3),
});

export type GetTaxSummaryOutput = z.infer<typeof GetTaxSummaryOutputSchema>;
