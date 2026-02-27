import type { WebsiteWallOfLoveItemDto } from "@corely/contracts";
import type { WebsiteWallOfLoveImageRecord } from "../ports/wall-of-love-images-repository.port";
import type { WebsiteWallOfLoveItemRecord } from "../ports/wall-of-love-repository.port";

export const buildImageMap = (images: WebsiteWallOfLoveImageRecord[]): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  for (const image of images) {
    const current = map.get(image.itemId) ?? [];
    if (current.length === 0) {
      current.push(image.fileId);
    }
    map.set(image.itemId, current);
  }
  return map;
};

export const toWebsiteWallOfLoveItemDto = (
  item: WebsiteWallOfLoveItemRecord,
  imageMap: Map<string, string[]>
): WebsiteWallOfLoveItemDto => ({
  id: item.id,
  siteId: item.siteId,
  type: item.type,
  status: item.status,
  order: item.order,
  quote: item.quote ?? null,
  authorName: item.authorName ?? null,
  authorTitle: item.authorTitle ?? null,
  sourceLabel: item.sourceLabel ?? null,
  linkUrl: item.linkUrl ?? null,
  imageFileIds: imageMap.get(item.id) ?? [],
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});
