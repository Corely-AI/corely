import { z } from "zod";
import { TaxFilingDetailSchema } from "./tax-filing-detail.schema";

export const RecalculateTaxFilingRequestSchema = z.object({});
export type RecalculateTaxFilingRequest = z.infer<typeof RecalculateTaxFilingRequestSchema>;

export const RecalculateTaxFilingResponseSchema = z.object({
  filing: TaxFilingDetailSchema,
});
export type RecalculateTaxFilingResponse = z.infer<typeof RecalculateTaxFilingResponseSchema>;
