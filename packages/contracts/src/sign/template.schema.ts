import { z } from "zod";
import { SignLayoutSchema } from "./layout.schema";

export const SignTemplateIdSchema = z.string().uuid();
export const SaveSignDraftSchema = z
  .object({
    expectedRevision: z.number().int().min(0).max(2147483646),
    title: z.string().trim().min(1).max(160),
    layout: SignLayoutSchema,
  })
  .strict();
export const SignDraftSchema = SaveSignDraftSchema.omit({ expectedRevision: true }).extend({
  archived: z.boolean().default(false),
  templateId: SignTemplateIdSchema,
  revision: z.number().int().positive(),
});
export type SignDraft = z.infer<typeof SignDraftSchema>;
export const SignDraftSummarySchema = SignDraftSchema.omit({ layout: true });
export const SignDraftListSchema = z.object({
  items: z.array(SignDraftSummarySchema),
  nextCursor: SignTemplateIdSchema.nullable(),
});
export type SignDraftSummary = z.infer<typeof SignDraftSummarySchema>;
export const UploadDraftPdfSchema = z.object({ base64: z.string().min(8).max(13981016) }).strict();
export const DraftPdfSchema = z.object({ base64: z.string().nullable() }).strict();
export const PublishSignTemplateSchema = z
  .object({ revision: z.number().int().positive() })
  .strict();
export const SignPublicationSchema = z.object({
  templateId: SignTemplateIdSchema,
  revision: z.number().int().positive(),
  originalSha256: z.string().length(64),
  canonicalSha256: z.string().length(64),
  profile: z.literal("static-pdf-v1"),
});
export type SignPublication = z.infer<typeof SignPublicationSchema>;
