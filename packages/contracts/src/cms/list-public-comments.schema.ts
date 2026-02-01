import { z } from "zod";
import { CmsCommentDtoSchema } from "./cms.types";
import { CmsPageInfoSchema } from "./list-posts.schema";

export const ListPublicCmsCommentsInputSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListPublicCmsCommentsOutputSchema = z.object({
  items: z.array(CmsCommentDtoSchema),
  pageInfo: CmsPageInfoSchema,
});

export type ListPublicCmsCommentsInput = z.infer<typeof ListPublicCmsCommentsInputSchema>;
export type ListPublicCmsCommentsOutput = z.infer<typeof ListPublicCmsCommentsOutputSchema>;
