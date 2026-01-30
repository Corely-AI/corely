import { z } from "zod";
import { TaxFilingDetailSchema } from "./tax-filing-detail.schema";

export const MarkTaxFilingPaidRequestSchema = z.object({
  paidAt: z.string().datetime(),
  method: z.string(),
  amountCents: z.number().int(),
  proofDocumentId: z.string().optional(),
});
export type MarkTaxFilingPaidRequest = z.infer<typeof MarkTaxFilingPaidRequestSchema>;

export const MarkTaxFilingPaidResponseSchema = z.object({
  filing: TaxFilingDetailSchema,
});
export type MarkTaxFilingPaidResponse = z.infer<typeof MarkTaxFilingPaidResponseSchema>;
