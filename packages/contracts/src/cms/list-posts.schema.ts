import { z } from "zod";
import { CmsPostStatusSchema, CmsPostSummaryDtoSchema } from "./cms.types";

export const CmsPageInfoSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
});

export const ListCmsPostsInputSchema = z.object({
  status: CmsPostStatusSchema.optional(),
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListCmsPostsOutputSchema = z.object({
  items: z.array(CmsPostSummaryDtoSchema),
  pageInfo: CmsPageInfoSchema,
});

export type ListCmsPostsInput = z.infer<typeof ListCmsPostsInputSchema>;
export type ListCmsPostsOutput = z.infer<typeof ListCmsPostsOutputSchema>;
