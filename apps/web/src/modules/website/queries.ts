import { createCrudQueryKeys } from "@/shared/crud";
import type { ListWebsitePagesInput, ListWebsiteSitesInput } from "@corely/contracts";

export const websiteSiteKeys = createCrudQueryKeys("website-sites");
export const websitePageKeys = createCrudQueryKeys("website-pages");
export const websitePageContentKeys = {
  detail: (pageId: string) => ["website-pages", "content", pageId] as const,
};

export const websiteDomainKeys = {
  list: (siteId: string) => ["website-domains", siteId],
};

export const websiteMenuKeys = {
  list: (siteId: string) => ["website-menus", siteId],
};

export const websiteWallOfLoveKeys = {
  list: (siteId: string) => ["website-wall-of-love", siteId],
};

export const websiteSiteListKey = (params?: ListWebsiteSitesInput) => [
  "website-sites",
  "list",
  params ?? {},
];

export const websitePageListKey = (params?: ListWebsitePagesInput) => [
  "website-pages",
  "list",
  params ?? {},
];
