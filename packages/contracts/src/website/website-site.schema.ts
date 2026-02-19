import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { WebsiteSiteSchema, WebsiteSlugSchema } from "./website.types";
import {
  WebsiteSiteCommonSettingsSchema,
  WebsiteSiteCustomSettingsSchema,
  WebsiteSiteSettingsSchema,
  WebsiteSiteThemeSettingsSchema,
} from "./website-site-settings.schema";

export const CreateWebsiteSiteInputSchema = z.object({
  name: z.string().min(1),
  slug: WebsiteSlugSchema,
  defaultLocale: z.string().min(2),
  common: WebsiteSiteCommonSettingsSchema.optional(),
  theme: WebsiteSiteThemeSettingsSchema.optional(),
  custom: WebsiteSiteCustomSettingsSchema.optional(),
  brandingJson: WebsiteSiteCommonSettingsSchema.optional().nullable(),
  themeJson: WebsiteSiteThemeSettingsSchema.optional().nullable(),
  isDefault: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateWebsiteSiteInput = z.infer<typeof CreateWebsiteSiteInputSchema>;

export const UpdateWebsiteSiteInputSchema = z.object({
  name: z.string().min(1).optional(),
  slug: WebsiteSlugSchema.optional(),
  defaultLocale: z.string().min(2).optional(),
  common: WebsiteSiteCommonSettingsSchema.optional(),
  theme: WebsiteSiteThemeSettingsSchema.optional(),
  custom: WebsiteSiteCustomSettingsSchema.optional(),
  brandingJson: WebsiteSiteCommonSettingsSchema.optional().nullable(),
  themeJson: WebsiteSiteThemeSettingsSchema.optional().nullable(),
  isDefault: z.boolean().optional(),
});
export type UpdateWebsiteSiteInput = z.infer<typeof UpdateWebsiteSiteInputSchema>;

export const WebsiteSiteWithSettingsSchema = WebsiteSiteSchema.extend({
  settings: WebsiteSiteSettingsSchema,
});
export type WebsiteSiteWithSettings = z.infer<typeof WebsiteSiteWithSettingsSchema>;

export const GetWebsiteSiteOutputSchema = z.object({
  site: WebsiteSiteWithSettingsSchema,
});
export type GetWebsiteSiteOutput = z.infer<typeof GetWebsiteSiteOutputSchema>;

export const ListWebsiteSitesInputSchema = ListQuerySchema;
export type ListWebsiteSitesInput = z.infer<typeof ListWebsiteSitesInputSchema>;

export const ListWebsiteSitesOutputSchema = createListResponseSchema(WebsiteSiteSchema);
export type ListWebsiteSitesOutput = z.infer<typeof ListWebsiteSitesOutputSchema>;
