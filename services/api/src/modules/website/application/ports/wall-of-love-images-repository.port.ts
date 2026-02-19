export type WebsiteWallOfLoveImageRecord = {
  id: string;
  tenantId: string;
  itemId: string;
  fileId: string;
  order: number;
};

export interface WebsiteWallOfLoveImagesRepositoryPort {
  listByItemIds(tenantId: string, itemIds: string[]): Promise<WebsiteWallOfLoveImageRecord[]>;
  replaceForItem(
    tenantId: string,
    itemId: string,
    images: WebsiteWallOfLoveImageRecord[]
  ): Promise<void>;
}

export const WEBSITE_WALL_OF_LOVE_IMAGES_REPO_PORT = "website/wall-of-love-images-repository-port";
