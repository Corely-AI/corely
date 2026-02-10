import { z } from "zod";
import { DocumentLinkEntityTypeSchema } from "./document.types";

export const UnlinkDocumentInputSchema = z.object({
  documentId: z.string(),
  entityType: DocumentLinkEntityTypeSchema,
  entityId: z.string(),
});

export const UnlinkDocumentOutputSchema = z.object({
  success: z.boolean(),
});

export type UnlinkDocumentInput = z.infer<typeof UnlinkDocumentInputSchema>;
export type UnlinkDocumentOutput = z.infer<typeof UnlinkDocumentOutputSchema>;
