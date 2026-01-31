import { z } from "zod";
import { TaxFilingDetailSchema } from "./tax-filing-detail.schema";

export const AttachTaxFilingPaymentProofRequestSchema = z.object({
  proofDocumentId: z.string(),
});
export type AttachTaxFilingPaymentProofRequest = z.infer<
  typeof AttachTaxFilingPaymentProofRequestSchema
>;

export const AttachTaxFilingPaymentProofResponseSchema = z.object({
  filing: TaxFilingDetailSchema,
});
export type AttachTaxFilingPaymentProofResponse = z.infer<
  typeof AttachTaxFilingPaymentProofResponseSchema
>;
