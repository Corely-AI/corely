import type { TransactionContext } from "@corely/kernel";
import type { WebsiteMenu } from "@corely/contracts";

export interface WebsiteMenuRepositoryPort {
  upsert(menu: WebsiteMenu, tx?: TransactionContext): Promise<WebsiteMenu>;
  listBySite(tenantId: string, siteId: string): Promise<WebsiteMenu[]>;
}

export const WEBSITE_MENU_REPO_PORT = "website/menu-repository-port";
