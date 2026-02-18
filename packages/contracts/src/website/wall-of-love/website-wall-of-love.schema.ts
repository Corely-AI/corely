import { z } from "zod";

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const X_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);

const normalizeImageFileIds = (rawIds: string[] | undefined): string[] | undefined => {
  if (!rawIds) {
    return undefined;
  }
  const deduped = Array.from(new Set(rawIds.map((id) => id.trim()).filter(Boolean)));
  return deduped;
};

const extractYoutubeVideoId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }
  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname.replace("/shorts/", "").split("/")[0] ?? null;
  }
  if (url.pathname.startsWith("/embed/")) {
    return url.pathname.replace("/embed/", "").split("/")[0] ?? null;
  }
  if (url.pathname.startsWith("/live/")) {
    return url.pathname.replace("/live/", "").split("/")[0] ?? null;
  }

  return null;
};

export const parseWebsiteWallOfLoveYoutubeUrl = (
  rawUrl: string
): { videoId: string; canonicalUrl: string } | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const videoId = extractYoutubeVideoId(parsed);
  if (!videoId || !YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    return null;
  }

  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
};

export const normalizeWebsiteWallOfLoveXUrl = (rawUrl: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (!X_HOSTS.has(host)) {
    return null;
  }

  const normalizedPath =
    parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;
  return `https://x.com${normalizedPath}${parsed.search}`;
};

const LinkUrlSchema = z.string().trim().url().max(1200);

const normalizeByType = (
  type: "image" | "youtube" | "x",
  linkUrl: string | null | undefined
): string | null | undefined => {
  if (type === "image") {
    return undefined;
  }
  if (!linkUrl) {
    return linkUrl;
  }
  if (type === "youtube") {
    return parseWebsiteWallOfLoveYoutubeUrl(linkUrl)?.canonicalUrl ?? null;
  }
  return normalizeWebsiteWallOfLoveXUrl(linkUrl);
};

const validateTypeSpecificFields = (
  value: {
    type?: "image" | "youtube" | "x" | undefined;
    linkUrl?: string | null | undefined;
    imageFileIds?: string[] | undefined;
  },
  ctx: z.RefinementCtx
) => {
  if (!value.type) {
    return;
  }

  if ((value.type === "youtube" || value.type === "x") && !value.linkUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["linkUrl"],
      message: `linkUrl is required for ${value.type} items`,
    });
  }

  if (value.type === "youtube" && value.linkUrl) {
    if (!parseWebsiteWallOfLoveYoutubeUrl(value.linkUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkUrl"],
        message: "linkUrl must be a valid YouTube URL",
      });
    }
  }

  if (value.type === "x" && value.linkUrl) {
    if (!normalizeWebsiteWallOfLoveXUrl(value.linkUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkUrl"],
        message: "linkUrl must be a valid x.com or twitter.com URL",
      });
    }
  }

  if (value.type === "image" && value.imageFileIds && value.imageFileIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["imageFileIds"],
      message: "imageFileIds must contain at least one file for image items",
    });
  }
};

export const WebsiteWallOfLoveItemTypeSchema = z.enum(["image", "youtube", "x"]);
export type WebsiteWallOfLoveItemType = z.infer<typeof WebsiteWallOfLoveItemTypeSchema>;

export const WebsiteWallOfLoveStatusSchema = z.enum(["draft", "published"]);
export type WebsiteWallOfLoveStatus = z.infer<typeof WebsiteWallOfLoveStatusSchema>;

const WallOfLoveMutableFieldsSchema = z.object({
  type: WebsiteWallOfLoveItemTypeSchema,
  quote: z.string().trim().min(1).max(3000).optional(),
  authorName: z.string().trim().min(1).max(200).optional(),
  authorTitle: z.string().trim().min(1).max(200).optional(),
  sourceLabel: z.string().trim().min(1).max(200).optional(),
  linkUrl: LinkUrlSchema.optional(),
  imageFileIds: z.array(z.string().trim().min(1)).max(20).optional(),
});

export const CreateWebsiteWallOfLoveItemInputSchema = z
  .object({
    siteId: z.string().min(1),
    ...WallOfLoveMutableFieldsSchema.shape,
  })
  .superRefine((value, ctx) => validateTypeSpecificFields(value, ctx))
  .transform((value) => ({
    ...value,
    linkUrl: normalizeByType(value.type, value.linkUrl) ?? undefined,
    imageFileIds: normalizeImageFileIds(value.imageFileIds),
  }));
export type CreateWebsiteWallOfLoveItemInput = z.infer<
  typeof CreateWebsiteWallOfLoveItemInputSchema
>;

export const UpdateWebsiteWallOfLoveItemInputSchema = z
  .object({
    type: WebsiteWallOfLoveItemTypeSchema.optional(),
    quote: z.string().trim().min(1).max(3000).optional().nullable(),
    authorName: z.string().trim().min(1).max(200).optional().nullable(),
    authorTitle: z.string().trim().min(1).max(200).optional().nullable(),
    sourceLabel: z.string().trim().min(1).max(200).optional().nullable(),
    linkUrl: LinkUrlSchema.optional().nullable(),
    imageFileIds: z.array(z.string().trim().min(1)).max(20).optional(),
  })
  .superRefine((value, ctx) => validateTypeSpecificFields(value, ctx))
  .transform((value) => ({
    ...value,
    imageFileIds: normalizeImageFileIds(value.imageFileIds),
  }));
export type UpdateWebsiteWallOfLoveItemInput = z.infer<
  typeof UpdateWebsiteWallOfLoveItemInputSchema
>;

export const ReorderWebsiteWallOfLoveItemsInputSchema = z.object({
  siteId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderWebsiteWallOfLoveItemsInput = z.infer<
  typeof ReorderWebsiteWallOfLoveItemsInputSchema
>;

export const PublishWebsiteWallOfLoveItemInputSchema = z.object({
  itemId: z.string().min(1),
});
export type PublishWebsiteWallOfLoveItemInput = z.infer<
  typeof PublishWebsiteWallOfLoveItemInputSchema
>;

export const UnpublishWebsiteWallOfLoveItemInputSchema = z.object({
  itemId: z.string().min(1),
});
export type UnpublishWebsiteWallOfLoveItemInput = z.infer<
  typeof UnpublishWebsiteWallOfLoveItemInputSchema
>;

export const WebsiteWallOfLoveItemDtoSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  type: WebsiteWallOfLoveItemTypeSchema,
  status: WebsiteWallOfLoveStatusSchema,
  order: z.number().int(),
  quote: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorTitle: z.string().nullable().optional(),
  sourceLabel: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  imageFileIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WebsiteWallOfLoveItemDto = z.infer<typeof WebsiteWallOfLoveItemDtoSchema>;

export const WebsiteWallOfLoveUpsertOutputSchema = z.object({
  item: WebsiteWallOfLoveItemDtoSchema,
});
export type WebsiteWallOfLoveUpsertOutput = z.infer<typeof WebsiteWallOfLoveUpsertOutputSchema>;

export const ListWebsiteWallOfLoveItemsOutputSchema = z.object({
  items: z.array(WebsiteWallOfLoveItemDtoSchema),
});
export type ListWebsiteWallOfLoveItemsOutput = z.infer<
  typeof ListWebsiteWallOfLoveItemsOutputSchema
>;

export const ListPublicWebsiteWallOfLoveItemsInputSchema = z.object({
  siteId: z.string().min(1),
  locale: z.string().trim().min(1).optional(),
});
export type ListPublicWebsiteWallOfLoveItemsInput = z.infer<
  typeof ListPublicWebsiteWallOfLoveItemsInputSchema
>;

export const PublicWebsiteWallOfLoveItemSchema = z.object({
  id: z.string(),
  type: WebsiteWallOfLoveItemTypeSchema,
  linkUrl: z.string().optional(),
  imageFileIds: z.array(z.string()),
  quote: z.string().optional(),
  authorName: z.string().optional(),
  authorTitle: z.string().optional(),
  sourceLabel: z.string().optional(),
  order: z.number().int(),
});
export type PublicWebsiteWallOfLoveItem = z.infer<typeof PublicWebsiteWallOfLoveItemSchema>;

export const ListPublicWebsiteWallOfLoveItemsOutputSchema = z.object({
  items: z.array(PublicWebsiteWallOfLoveItemSchema),
});
export type ListPublicWebsiteWallOfLoveItemsOutput = z.infer<
  typeof ListPublicWebsiteWallOfLoveItemsOutputSchema
>;
