import type { TransactionContext } from "@corely/kernel";
import type { WebsitePage, WebsitePageStatus } from "@corely/contracts";

export interface WebsitePageRepositoryPort {
  create(page: WebsitePage, tx?: TransactionContext): Promise<WebsitePage>;
  update(page: WebsitePage, tx?: TransactionContext): Promise<WebsitePage>;
  findById(tenantId: string, pageId: string, tx?: TransactionContext): Promise<WebsitePage | null>;
  findByPath(
    tenantId: string,
    siteId: string,
    path: string,
    locale: string
  ): Promise<WebsitePage | null>;
  list(
    tenantId: string,
    params: {
      siteId: string;
      status?: WebsitePageStatus;
      q?: string;
      page: number;
      pageSize: number;
      sort?: string | string[];
    }
  ): Promise<{ items: WebsitePage[]; total: number }>;
}

export const WEBSITE_PAGE_REPO_PORT = "website/page-repository-port";
