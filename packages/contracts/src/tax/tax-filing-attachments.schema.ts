import { z } from "zod";
import { DocumentDtoSchema } from "../documents/document.types";

export const TaxFilingAttachmentsResponseSchema = z.object({
  items: z.array(DocumentDtoSchema),
});
export type TaxFilingAttachmentsResponse = z.infer<typeof TaxFilingAttachmentsResponseSchema>;

export const AttachTaxFilingDocumentRequestSchema = z.object({
  documentId: z.string(),
});
export type AttachTaxFilingDocumentRequest = z.infer<typeof AttachTaxFilingDocumentRequestSchema>;

export const AttachTaxFilingDocumentResponseSchema = z.object({
  document: DocumentDtoSchema,
});
export type AttachTaxFilingDocumentResponse = z.infer<typeof AttachTaxFilingDocumentResponseSchema>;
