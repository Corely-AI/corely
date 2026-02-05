import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { WebsitePageSchema, WebsitePageStatusSchema } from "./website.types";

export const CreateWebsitePageInputSchema = z.object({
  siteId: z.string(),
  path: z.string().min(1),
  locale: z.string().min(2),
  template: z.string().min(1),
  cmsEntryId: z.string().min(1),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoImageFileId: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type CreateWebsitePageInput = z.infer<typeof CreateWebsitePageInputSchema>;

export const UpdateWebsitePageInputSchema = z.object({
  path: z.string().min(1).optional(),
  locale: z.string().min(2).optional(),
  template: z.string().min(1).optional(),
  cmsEntryId: z.string().min(1).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoImageFileId: z.string().optional().nullable(),
});
export type UpdateWebsitePageInput = z.infer<typeof UpdateWebsitePageInputSchema>;

export const GetWebsitePageOutputSchema = z.object({
  page: WebsitePageSchema,
});
export type GetWebsitePageOutput = z.infer<typeof GetWebsitePageOutputSchema>;

export const ListWebsitePagesInputSchema = ListQuerySchema.extend({
  siteId: z.string().optional(),
  status: WebsitePageStatusSchema.optional(),
});
export type ListWebsitePagesInput = z.infer<typeof ListWebsitePagesInputSchema>;

export const ListWebsitePagesOutputSchema = createListResponseSchema(WebsitePageSchema);
export type ListWebsitePagesOutput = z.infer<typeof ListWebsitePagesOutputSchema>;
