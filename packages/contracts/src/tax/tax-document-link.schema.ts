import { z } from "zod";

/**
 * Entity type that a TaxDocumentLink points to.
 */
export const TaxDocumentLinkEntityTypeSchema = z.enum(["FILING", "PAYMENT"]);
export type TaxDocumentLinkEntityType = z.infer<typeof TaxDocumentLinkEntityTypeSchema>;

/**
 * TaxDocumentLink — a link between a tax filing/payment and a document stored
 * in the Documents module. Tax does NOT own file storage.
 */
export const TaxDocumentLinkSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  entityType: TaxDocumentLinkEntityTypeSchema,
  entityId: z.string(), // TaxReport.id or payment reference
  documentId: z.string(), // Documents module document ID
  label: z.string().optional().nullable(),
  createdAt: z.string().datetime(),
  createdBy: z.string().optional().nullable(),
});
export type TaxDocumentLink = z.infer<typeof TaxDocumentLinkSchema>;

/**
 * Input for linking a document to a filing or payment.
 */
export const LinkTaxDocumentInputSchema = z.object({
  entityType: TaxDocumentLinkEntityTypeSchema,
  entityId: z.string(),
  documentId: z.string(),
  label: z.string().optional(),
});
export type LinkTaxDocumentInput = z.infer<typeof LinkTaxDocumentInputSchema>;

export const LinkTaxDocumentOutputSchema = z.object({
  link: TaxDocumentLinkSchema,
});
export type LinkTaxDocumentOutput = z.infer<typeof LinkTaxDocumentOutputSchema>;

export const ListTaxDocumentLinksOutputSchema = z.object({
  links: z.array(TaxDocumentLinkSchema),
});
export type ListTaxDocumentLinksOutput = z.infer<typeof ListTaxDocumentLinksOutputSchema>;
