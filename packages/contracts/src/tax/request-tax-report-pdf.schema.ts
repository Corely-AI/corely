import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const TaxReportPdfStatusSchema = z.enum(["PENDING", "READY"]);
export type TaxReportPdfStatus = z.infer<typeof TaxReportPdfStatusSchema>;

export const RequestTaxReportPdfOutputSchema = z.object({
  status: TaxReportPdfStatusSchema,
  downloadUrl: z.string().optional(),
  expiresAt: utcInstantSchema.optional(),
});
export type RequestTaxReportPdfOutput = z.infer<typeof RequestTaxReportPdfOutputSchema>;
