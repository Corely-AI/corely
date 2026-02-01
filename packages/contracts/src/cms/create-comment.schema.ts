import { z } from "zod";
import { CmsCommentDtoSchema } from "./cms.types";

export const CreateCmsCommentInputSchema = z.object({
  bodyText: z.string().min(1),
  parentId: z.string().optional(),
});

export const CreateCmsCommentOutputSchema = z.object({
  comment: CmsCommentDtoSchema,
});

export type CreateCmsCommentInput = z.infer<typeof CreateCmsCommentInputSchema>;
export type CreateCmsCommentOutput = z.infer<typeof CreateCmsCommentOutputSchema>;
