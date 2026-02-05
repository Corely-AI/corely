import { z } from "zod";
import { WebsiteMenuPublicSchema, WebsiteSeoSchema } from "./website.types";

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

export const ResolveWebsitePublicOutputSchema = z.object({
  siteId: z.string(),
  siteSlug: z.string(),
  pageId: z.string(),
  path: z.string(),
  locale: z.string(),
  template: z.string(),
  payloadJson: z.unknown(),
  seo: WebsiteSeoSchema.optional().nullable(),
  menus: z.array(WebsiteMenuPublicSchema),
  snapshotVersion: z.number().int().nonnegative().optional().nullable(),
});
export type ResolveWebsitePublicOutput = z.infer<typeof ResolveWebsitePublicOutputSchema>;

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
