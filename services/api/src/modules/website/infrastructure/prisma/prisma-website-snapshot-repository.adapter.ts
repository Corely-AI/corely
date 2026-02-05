import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { WebsitePageSnapshot } from "@corely/contracts";
import type { WebsiteSnapshotRepositoryPort } from "../../application/ports/snapshot-repository.port";

const mapSnapshot = (row: any): WebsitePageSnapshot => ({
  id: row.id,
  tenantId: row.tenantId,
  siteId: row.siteId,
  pageId: row.pageId,
  path: row.path,
  locale: row.locale,
  version: row.version,
  payloadJson: row.payloadJson,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class PrismaWebsiteSnapshotRepository implements WebsiteSnapshotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    snapshot: WebsitePageSnapshot,
    tx?: TransactionContext
  ): Promise<WebsitePageSnapshot> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websitePageSnapshot.create({
      data: {
        id: snapshot.id,
        tenantId: snapshot.tenantId,
        siteId: snapshot.siteId,
        pageId: snapshot.pageId,
        path: snapshot.path,
        locale: snapshot.locale,
        version: snapshot.version,
        payloadJson: snapshot.payloadJson as any,
      },
    });
    return mapSnapshot(row);
  }

  async findLatest(tenantId: string, pageId: string): Promise<WebsitePageSnapshot | null> {
    const row = await this.prisma.websitePageSnapshot.findFirst({
      where: { tenantId, pageId },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    });
    return row ? mapSnapshot(row) : null;
  }

  async getLatestVersion(
    tenantId: string,
    pageId: string,
    tx?: TransactionContext
  ): Promise<number | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websitePageSnapshot.findFirst({
      where: { tenantId, pageId },
      orderBy: [{ version: "desc" }],
      select: { version: true },
    });
    return row?.version ?? null;
  }
}
