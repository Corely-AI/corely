import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { WebsiteDomain } from "@corely/contracts";
import type { WebsiteDomainRepositoryPort } from "../../application/ports/domain-repository.port";

const mapDomain = (row: any): WebsiteDomain => ({
  id: row.id,
  tenantId: row.tenantId,
  siteId: row.siteId,
  hostname: row.hostname,
  isPrimary: row.isPrimary,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class PrismaWebsiteDomainRepository implements WebsiteDomainRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(domain: WebsiteDomain, tx?: TransactionContext): Promise<WebsiteDomain> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteDomain.create({
      data: {
        id: domain.id,
        tenantId: domain.tenantId,
        siteId: domain.siteId,
        hostname: domain.hostname,
        isPrimary: domain.isPrimary,
      },
    });
    return mapDomain(row);
  }

  async update(domain: WebsiteDomain, tx?: TransactionContext): Promise<WebsiteDomain> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteDomain.update({
      where: { id: domain.id },
      data: {
        hostname: domain.hostname,
        isPrimary: domain.isPrimary,
      },
    });
    return mapDomain(row);
  }

  async delete(domainId: string, tenantId: string, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.websiteDomain.deleteMany({
      where: { id: domainId, tenantId },
    });
  }

  async findById(
    tenantId: string,
    domainId: string,
    tx?: TransactionContext
  ): Promise<WebsiteDomain | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteDomain.findFirst({ where: { id: domainId, tenantId } });
    return row ? mapDomain(row) : null;
  }

  async findByHostname(tenantId: string | null, hostname: string): Promise<WebsiteDomain | null> {
    const where: any = { hostname };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    const row = await this.prisma.websiteDomain.findFirst({ where });
    return row ? mapDomain(row) : null;
  }

  async listBySite(tenantId: string, siteId: string): Promise<WebsiteDomain[]> {
    const rows = await this.prisma.websiteDomain.findMany({
      where: { tenantId, siteId },
      orderBy: [{ isPrimary: "desc" }, { hostname: "asc" }],
    });
    return rows.map(mapDomain);
  }

  async clearPrimaryForSite(
    tenantId: string,
    siteId: string,
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.websiteDomain.updateMany({
      where: { tenantId, siteId, isPrimary: true },
      data: { isPrimary: false },
    });
  }
}
