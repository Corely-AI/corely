import { z } from "zod";

export const WebsitePageStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export type WebsitePageStatus = z.infer<typeof WebsitePageStatusSchema>;

export const WebsiteSeoSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageFileId: z.string().optional().nullable(),
});
export type WebsiteSeo = z.infer<typeof WebsiteSeoSchema>;

export const WebsiteSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case");
export type WebsiteSlug = z.infer<typeof WebsiteSlugSchema>;

export const WebsiteSiteSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: WebsiteSlugSchema,
  defaultLocale: z.string(),
  brandingJson: z.unknown().optional().nullable(),
  themeJson: z.unknown().optional().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WebsiteSite = z.infer<typeof WebsiteSiteSchema>;

export const WebsiteDomainSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  siteId: z.string(),
  hostname: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WebsiteDomain = z.infer<typeof WebsiteDomainSchema>;

export const WebsitePageSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  siteId: z.string(),
  path: z.string(),
  locale: z.string(),
  template: z.string(),
  status: WebsitePageStatusSchema,
  cmsEntryId: z.string(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoImageFileId: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WebsitePage = z.infer<typeof WebsitePageSchema>;

export const WebsiteMenuSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  siteId: z.string(),
  name: z.string(),
  locale: z.string(),
  itemsJson: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WebsiteMenu = z.infer<typeof WebsiteMenuSchema>;

export const WebsiteMenuPublicSchema = z.object({
  name: z.string(),
  locale: z.string(),
  itemsJson: z.unknown(),
});
export type WebsiteMenuPublic = z.infer<typeof WebsiteMenuPublicSchema>;

export const WebsitePageSnapshotSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  siteId: z.string(),
  pageId: z.string(),
  path: z.string(),
  locale: z.string(),
  version: z.number().int().nonnegative(),
  payloadJson: z.unknown(),
  createdAt: z.string(),
});
export type WebsitePageSnapshot = z.infer<typeof WebsitePageSnapshotSchema>;
