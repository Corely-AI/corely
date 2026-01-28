import { z } from "zod";
import { CmsPublicPostDtoSchema } from "./cms.types";

export const GetPublicCmsPostInputSchema = z.object({
  slug: z.string().min(1),
});

export const GetPublicCmsPostOutputSchema = z.object({
  post: CmsPublicPostDtoSchema,
});

export type GetPublicCmsPostInput = z.infer<typeof GetPublicCmsPostInputSchema>;
export type GetPublicCmsPostOutput = z.infer<typeof GetPublicCmsPostOutputSchema>;
