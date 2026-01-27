import { z } from 'zod';
import { CmsCommentDtoSchema, CmsCommentStatusSchema } from './cms.types';

export const UpdateCmsCommentStatusInputSchema = z.object({
 status: CmsCommentStatusSchema,
});

export const UpdateCmsCommentStatusOutputSchema = z.object({
 comment: CmsCommentDtoSchema,
});

export type UpdateCmsCommentStatusInput = z.infer<typeof UpdateCmsCommentStatusInputSchema>;
export type UpdateCmsCommentStatusOutput = z.infer<typeof UpdateCmsCommentStatusOutputSchema>;
