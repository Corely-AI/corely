import { z } from "zod";
import { DocumentDtoSchema } from "./document.types";
import { FileDtoSchema } from "./file.types";

export const UploadFileBase64InputSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  base64: z.string(),
  isPublic: z.boolean().optional().default(false),
  category: z.string().optional(),
  purpose: z.string().optional(),
});

export type UploadFileBase64Input = z.infer<typeof UploadFileBase64InputSchema>;

export const UploadFileOutputSchema = z.object({
  document: DocumentDtoSchema,
  file: FileDtoSchema,
});

export type UploadFileOutput = z.infer<typeof UploadFileOutputSchema>;
