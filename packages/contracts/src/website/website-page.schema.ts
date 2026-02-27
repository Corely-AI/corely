import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { WebsitePageSchema, WebsitePageStatusSchema } from "./website.types";
import { WebsitePageContentSchema } from "./blocks";

export const CreateWebsitePageInputSchema = z
  .object({
    siteId: z.string(),
    path: z.string().min(1),
    locale: z.string().min(2),
    template: z.string().min(1).optional(),
    templateKey: z.string().min(1).optional(),
    cmsEntryId: z.string().min(1).optional(),
    seoTitle: z.string().optional().nullable(),
    seoDescription: z.string().optional().nullable(),
    seoImageFileId: z.string().optional().nullable(),
    content: WebsitePageContentSchema.optional(),
    idempotencyKey: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.template && !value.templateKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templateKey"],
        message: "templateKey or template is required.",
      });
    }
  });
export type CreateWebsitePageInput = z.infer<typeof CreateWebsitePageInputSchema>;

export const UpdateWebsitePageInputSchema = z.object({
  path: z.string().min(1).optional(),
  locale: z.string().min(2).optional(),
  template: z.string().min(1).optional(),
  templateKey: z.string().min(1).optional(),
  cmsEntryId: z.string().min(1).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoImageFileId: z.string().optional().nullable(),
  content: WebsitePageContentSchema.optional(),
});
export type UpdateWebsitePageInput = z.infer<typeof UpdateWebsitePageInputSchema>;

export const GetWebsitePageOutputSchema = z.object({
  page: WebsitePageSchema,
});
export type GetWebsitePageOutput = z.infer<typeof GetWebsitePageOutputSchema>;

export const GetWebsitePageContentOutputSchema = z.object({
  pageId: z.string(),
  cmsEntryId: z.string(),
  content: WebsitePageContentSchema,
});
export type GetWebsitePageContentOutput = z.infer<typeof GetWebsitePageContentOutputSchema>;

export const UpdateWebsitePageContentInputSchema = WebsitePageContentSchema;
export type UpdateWebsitePageContentInput = z.infer<typeof UpdateWebsitePageContentInputSchema>;

export const UpdateWebsitePageContentOutputSchema = z.object({
  pageId: z.string(),
  cmsEntryId: z.string(),
  content: WebsitePageContentSchema,
});
export type UpdateWebsitePageContentOutput = z.infer<typeof UpdateWebsitePageContentOutputSchema>;

export const ListWebsitePagesInputSchema = ListQuerySchema.extend({
  siteId: z.string().optional(),
  status: WebsitePageStatusSchema.optional(),
});
export type ListWebsitePagesInput = z.infer<typeof ListWebsitePagesInputSchema>;

export const ListWebsitePagesOutputSchema = createListResponseSchema(WebsitePageSchema);
export type ListWebsitePagesOutput = z.infer<typeof ListWebsitePagesOutputSchema>;
