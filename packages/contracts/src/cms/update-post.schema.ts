import { z } from "zod";
import { CmsPostDtoSchema, CmsPostStatusSchema } from "./cms.types";

export const UpdateCmsPostInputSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().nullable().optional(),
  coverImageFileId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: CmsPostStatusSchema.optional(),
});

export const UpdateCmsPostOutputSchema = z.object({
  post: CmsPostDtoSchema,
});

export type UpdateCmsPostInput = z.infer<typeof UpdateCmsPostInputSchema>;
export type UpdateCmsPostOutput = z.infer<typeof UpdateCmsPostOutputSchema>;
