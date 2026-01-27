import { z } from 'zod';
import { CmsCommentDtoSchema, CmsCommentStatusSchema } from './cms.types';
import { CmsPageInfoSchema } from './list-posts.schema';

export const ListCmsCommentsInputSchema = z.object({
 postId: z.string().optional(),
 status: CmsCommentStatusSchema.optional(),
 page: z.number().int().positive().optional(),
 pageSize: z.number().int().positive().max(100).optional(),
});

export const ListCmsCommentsOutputSchema = z.object({
 items: z.array(CmsCommentDtoSchema),
 pageInfo: CmsPageInfoSchema,
});

export type ListCmsCommentsInput = z.infer<typeof ListCmsCommentsInputSchema>;
export type ListCmsCommentsOutput = z.infer<typeof ListCmsCommentsOutputSchema>;
