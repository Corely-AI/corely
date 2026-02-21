import { z } from "zod";
import { WebsiteMenuPublicSchema, WebsiteSeoSchema } from "./website.types";
import { WebsiteSiteSettingsSchema } from "./website-site-settings.schema";
import { WebsitePageContentSchema } from "./blocks";

export const WebsiteResolveModeSchema = z.enum(["live", "preview"]);
export type WebsiteResolveMode = z.infer<typeof WebsiteResolveModeSchema>;

export const ResolveWebsitePublicInputSchema = z.object({
  host: z.string().min(1),
  path: z.string().min(1),
  locale: z.string().optional(),
  mode: WebsiteResolveModeSchema.default("live"),
  token: z.string().optional(),
});
export type ResolveWebsitePublicInput = z.infer<typeof ResolveWebsitePublicInputSchema>;

export const ResolveWebsitePublicSiteSettingsInputSchema = z.object({
  siteId: z.string().min(1),
});
export type ResolveWebsitePublicSiteSettingsInput = z.infer<
  typeof ResolveWebsitePublicSiteSettingsInputSchema
>;

export const ResolveWebsitePublicPageSchema = z.object({
  id: z.string(),
  path: z.string(),
  locale: z.string(),
  templateKey: z.string(),
  content: WebsitePageContentSchema,
  seo: WebsiteSeoSchema.optional().nullable(),
});
export type ResolveWebsitePublicPage = z.infer<typeof ResolveWebsitePublicPageSchema>;

export const ResolveWebsitePublicOutputSchema = z.object({
  siteId: z.string(),
  siteSlug: z.string(),
  settings: WebsiteSiteSettingsSchema,
  page: ResolveWebsitePublicPageSchema,
  menus: z.array(WebsiteMenuPublicSchema),
  snapshotVersion: z.number().int().nonnegative().optional().nullable(),
  // Backward-compatible fields retained for old clients.
  pageId: z.string(),
  path: z.string(),
  locale: z.string(),
  template: z.string(),
  payloadJson: z.unknown(),
  seo: WebsiteSeoSchema.optional().nullable(),
});
export type ResolveWebsitePublicOutput = z.infer<typeof ResolveWebsitePublicOutputSchema>;

export const ResolveWebsitePublicSiteSettingsOutputSchema = z.object({
  siteId: z.string(),
  siteSlug: z.string(),
  settings: WebsiteSiteSettingsSchema,
});
export type ResolveWebsitePublicSiteSettingsOutput = z.infer<
  typeof ResolveWebsitePublicSiteSettingsOutputSchema
>;

export const WebsiteSlugExistsInputSchema = z.object({
  workspaceSlug: z.string().min(1),
  websiteSlug: z.string().min(1),
});
export type WebsiteSlugExistsInput = z.infer<typeof WebsiteSlugExistsInputSchema>;

export const WebsiteSlugExistsOutputSchema = z.object({
  exists: z.boolean(),
  isDefault: z.boolean().optional(),
});
export type WebsiteSlugExistsOutput = z.infer<typeof WebsiteSlugExistsOutputSchema>;
