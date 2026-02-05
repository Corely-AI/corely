import type { TransactionContext } from "@corely/kernel";
import type { WebsiteDomain } from "@corely/contracts";

export interface WebsiteDomainRepositoryPort {
  create(domain: WebsiteDomain, tx?: TransactionContext): Promise<WebsiteDomain>;
  update(domain: WebsiteDomain, tx?: TransactionContext): Promise<WebsiteDomain>;
  delete(domainId: string, tenantId: string, tx?: TransactionContext): Promise<void>;
  findById(
    tenantId: string,
    domainId: string,
    tx?: TransactionContext
  ): Promise<WebsiteDomain | null>;
  findByHostname(tenantId: string | null, hostname: string): Promise<WebsiteDomain | null>;
  listBySite(tenantId: string, siteId: string): Promise<WebsiteDomain[]>;
  clearPrimaryForSite(tenantId: string, siteId: string, tx?: TransactionContext): Promise<void>;
}

export const WEBSITE_DOMAIN_REPO_PORT = "website/domain-repository-port";
