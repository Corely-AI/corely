import { z } from "zod";

export const WebsitePagePublishedEventSchema = z.object({
  tenantId: z.string(),
  siteId: z.string(),
  pageId: z.string(),
  path: z.string(),
  locale: z.string(),
  cmsEntryId: z.string(),
  template: z.string(),
  snapshotId: z.string(),
  version: z.number().int().nonnegative(),
  publishedAt: z.string().datetime(),
});
export type WebsitePagePublishedEvent = z.infer<typeof WebsitePagePublishedEventSchema>;

export const WebsitePageUnpublishedEventSchema = z.object({
  tenantId: z.string(),
  siteId: z.string(),
  pageId: z.string(),
  path: z.string(),
  locale: z.string(),
  unpublishedAt: z.string().datetime(),
});
export type WebsitePageUnpublishedEvent = z.infer<typeof WebsitePageUnpublishedEventSchema>;

export const WebsiteExternalContentPublishedEventSchema = z.object({
  siteId: z.string(),
  key: z.enum(["siteCopy"]),
  locale: z.string().optional(),
  publishedAt: z.string().datetime(),
});
export type WebsiteExternalContentPublishedEvent = z.infer<
  typeof WebsiteExternalContentPublishedEventSchema
>;
