import { z } from "zod";
import { TaxFilingDetailSchema } from "./tax-filing-detail.schema";

export const SubmitTaxFilingRequestSchema = z.object({
  method: z.string(),
  submissionId: z.string(),
  submittedAt: z.string().datetime(),
  notes: z.string().optional(),
});
export type SubmitTaxFilingRequest = z.infer<typeof SubmitTaxFilingRequestSchema>;

export const SubmitTaxFilingResponseSchema = z.object({
  filing: TaxFilingDetailSchema,
});
export type SubmitTaxFilingResponse = z.infer<typeof SubmitTaxFilingResponseSchema>;
