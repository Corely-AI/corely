import { z } from "zod";
import { CmsPostDtoSchema } from "./cms.types";

export const GetCmsPostInputSchema = z.object({
  postId: z.string().min(1),
});

export const GetCmsPostOutputSchema = z.object({
  post: CmsPostDtoSchema,
});

export type GetCmsPostInput = z.infer<typeof GetCmsPostInputSchema>;
export type GetCmsPostOutput = z.infer<typeof GetCmsPostOutputSchema>;
