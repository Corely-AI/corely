import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { WebsiteSiteSchema } from "./website.types";

export const CreateWebsiteSiteInputSchema = z.object({
  name: z.string().min(1),
  defaultLocale: z.string().min(2),
  brandingJson: z.unknown().optional().nullable(),
  themeJson: z.unknown().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type CreateWebsiteSiteInput = z.infer<typeof CreateWebsiteSiteInputSchema>;

export const UpdateWebsiteSiteInputSchema = z.object({
  name: z.string().min(1).optional(),
  defaultLocale: z.string().min(2).optional(),
  brandingJson: z.unknown().optional().nullable(),
  themeJson: z.unknown().optional().nullable(),
});
export type UpdateWebsiteSiteInput = z.infer<typeof UpdateWebsiteSiteInputSchema>;

export const GetWebsiteSiteOutputSchema = z.object({
  site: WebsiteSiteSchema,
});
export type GetWebsiteSiteOutput = z.infer<typeof GetWebsiteSiteOutputSchema>;

export const ListWebsiteSitesInputSchema = ListQuerySchema;
export type ListWebsiteSitesInput = z.infer<typeof ListWebsiteSitesInputSchema>;

export const ListWebsiteSitesOutputSchema = createListResponseSchema(WebsiteSiteSchema);
export type ListWebsiteSitesOutput = z.infer<typeof ListWebsiteSitesOutputSchema>;
