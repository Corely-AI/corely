import { z } from "zod";
import { CmsPostDtoSchema, CmsPostStatusSchema } from "./cms.types";

export const CreateCmsPostInputSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().optional(),
  coverImageFileId: z.string().optional(),
  status: CmsPostStatusSchema.optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateCmsPostOutputSchema = z.object({
  post: CmsPostDtoSchema,
});

export type CreateCmsPostInput = z.infer<typeof CreateCmsPostInputSchema>;
export type CreateCmsPostOutput = z.infer<typeof CreateCmsPostOutputSchema>;
