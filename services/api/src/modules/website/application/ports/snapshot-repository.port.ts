import type { TransactionContext } from "@corely/kernel";
import type { WebsitePageSnapshot } from "@corely/contracts";

export interface WebsiteSnapshotRepositoryPort {
  create(snapshot: WebsitePageSnapshot, tx?: TransactionContext): Promise<WebsitePageSnapshot>;
  findLatest(tenantId: string, pageId: string): Promise<WebsitePageSnapshot | null>;
  getLatestVersion(
    tenantId: string,
    pageId: string,
    tx?: TransactionContext
  ): Promise<number | null>;
}

export const WEBSITE_SNAPSHOT_REPO_PORT = "website/snapshot-repository-port";
