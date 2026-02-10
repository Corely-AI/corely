import { z } from "zod";
import { DocumentLinkEntityTypeSchema, DocumentDtoSchema } from "./document.types";

export const ListLinkedDocumentsInputSchema = z.object({
  entityType: DocumentLinkEntityTypeSchema,
  entityId: z.string(),
});

export const ListLinkedDocumentsOutputSchema = z.object({
  items: z.array(DocumentDtoSchema),
});

export type ListLinkedDocumentsInput = z.infer<typeof ListLinkedDocumentsInputSchema>;
export type ListLinkedDocumentsOutput = z.infer<typeof ListLinkedDocumentsOutputSchema>;
