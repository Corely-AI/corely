import type { TransactionContext } from "@corely/kernel";
import type { WebsiteSite } from "@corely/contracts";

export interface WebsiteSiteRepositoryPort {
  create(site: WebsiteSite, tx?: TransactionContext): Promise<WebsiteSite>;
  update(site: WebsiteSite, tx?: TransactionContext): Promise<WebsiteSite>;
  findById(tenantId: string, siteId: string, tx?: TransactionContext): Promise<WebsiteSite | null>;
  list(
    tenantId: string,
    params: { q?: string; page: number; pageSize: number }
  ): Promise<{ items: WebsiteSite[]; total: number }>;
}

export const WEBSITE_SITE_REPO_PORT = "website/site-repository-port";
