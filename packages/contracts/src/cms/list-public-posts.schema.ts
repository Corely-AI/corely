import { z } from 'zod';
import { CmsPageInfoSchema } from './list-posts.schema';
import { CmsPostSummaryDtoSchema } from './cms.types';

export const ListPublicCmsPostsInputSchema = z.object({
 q: z.string().optional(),
 page: z.number().int().positive().optional(),
 pageSize: z.number().int().positive().max(100).optional(),
});

export const ListPublicCmsPostsOutputSchema = z.object({
 items: z.array(CmsPostSummaryDtoSchema),
 pageInfo: CmsPageInfoSchema,
});

export type ListPublicCmsPostsInput = z.infer<typeof ListPublicCmsPostsInputSchema>;
export type ListPublicCmsPostsOutput = z.infer<typeof ListPublicCmsPostsOutputSchema>;
