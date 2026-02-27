import type { WebsiteWallOfLoveItemType, WebsiteWallOfLoveStatus } from "@corely/contracts";

export type WebsiteWallOfLoveItemRecord = {
  id: string;
  tenantId: string;
  siteId: string;
  type: WebsiteWallOfLoveItemType;
  status: WebsiteWallOfLoveStatus;
  order: number;
  quote?: string | null;
  authorName?: string | null;
  authorTitle?: string | null;
  sourceLabel?: string | null;
  linkUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateWebsiteWallOfLoveItemRecord = WebsiteWallOfLoveItemRecord;
export type UpdateWebsiteWallOfLoveItemRecord = WebsiteWallOfLoveItemRecord;

export type ListWebsiteWallOfLoveItemsParams = {
  tenantId: string;
  siteId: string;
  status?: WebsiteWallOfLoveStatus;
};

export interface WebsiteWallOfLoveRepositoryPort {
  listForSite(params: ListWebsiteWallOfLoveItemsParams): Promise<WebsiteWallOfLoveItemRecord[]>;
  listPublishedBySiteId(siteId: string): Promise<WebsiteWallOfLoveItemRecord[]>;
  findById(tenantId: string, itemId: string): Promise<WebsiteWallOfLoveItemRecord | null>;
  create(record: CreateWebsiteWallOfLoveItemRecord): Promise<WebsiteWallOfLoveItemRecord>;
  update(record: UpdateWebsiteWallOfLoveItemRecord): Promise<WebsiteWallOfLoveItemRecord>;
  reorder(tenantId: string, siteId: string, orderedIds: string[], updatedAt: string): Promise<void>;
  nextOrder(tenantId: string, siteId: string): Promise<number>;
}

export const WEBSITE_WALL_OF_LOVE_REPO_PORT = "website/wall-of-love-repository-port";
