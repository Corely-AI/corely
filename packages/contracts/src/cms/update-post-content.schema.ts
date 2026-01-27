import { z } from "zod";
import { CmsPostDtoSchema } from "./cms.types";

export const UpdateCmsPostContentInputSchema = z.object({
  contentJson: z.unknown(),
});

export const UpdateCmsPostContentOutputSchema = z.object({
  post: CmsPostDtoSchema,
});

export type UpdateCmsPostContentInput = z.infer<typeof UpdateCmsPostContentInputSchema>;
export type UpdateCmsPostContentOutput = z.infer<typeof UpdateCmsPostContentOutputSchema>;
