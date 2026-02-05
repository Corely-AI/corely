import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { WebsiteSite } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../../application/ports/site-repository.port";

const mapSite = (row: any): WebsiteSite => ({
  id: row.id,
  tenantId: row.tenantId,
  name: row.name,
  slug: row.slug,
  defaultLocale: row.defaultLocale,
  brandingJson: row.brandingJson ?? null,
  themeJson: row.themeJson ?? null,
  isDefault: Boolean(row.isDefault),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class PrismaWebsiteSiteRepository implements WebsiteSiteRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(site: WebsiteSite, tx?: TransactionContext): Promise<WebsiteSite> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteSite.create({
      data: {
        id: site.id,
        tenantId: site.tenantId,
        name: site.name,
        slug: site.slug,
        defaultLocale: site.defaultLocale,
        brandingJson: site.brandingJson as any,
        themeJson: site.themeJson as any,
        isDefault: site.isDefault,
      },
    });
    return mapSite(row);
  }

  async update(site: WebsiteSite, tx?: TransactionContext): Promise<WebsiteSite> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteSite.update({
      where: { id: site.id },
      data: {
        name: site.name,
        slug: site.slug,
        defaultLocale: site.defaultLocale,
        brandingJson: site.brandingJson as any,
        themeJson: site.themeJson as any,
        isDefault: site.isDefault,
      },
    });
    return mapSite(row);
  }

  async findById(
    tenantId: string,
    siteId: string,
    tx?: TransactionContext
  ): Promise<WebsiteSite | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteSite.findFirst({ where: { id: siteId, tenantId } });
    return row ? mapSite(row) : null;
  }

  async findBySlug(
    tenantId: string,
    slug: string,
    tx?: TransactionContext
  ): Promise<WebsiteSite | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteSite.findFirst({ where: { tenantId, slug } });
    return row ? mapSite(row) : null;
  }

  async findDefaultByTenant(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<WebsiteSite | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websiteSite.findFirst({
      where: { tenantId, isDefault: true },
    });
    if (row) {
      return mapSite(row);
    }
    const fallback = await client.websiteSite.findFirst({
      where: { tenantId },
      orderBy: [{ updatedAt: "desc" }],
    });
    return fallback ? mapSite(fallback) : null;
  }

  async setDefault(tenantId: string, siteId: string, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.$transaction([
      client.websiteSite.updateMany({ where: { tenantId }, data: { isDefault: false } }),
      client.websiteSite.update({ where: { id: siteId }, data: { isDefault: true } }),
    ]);
  }

  async list(
    tenantId: string,
    params: { q?: string; page: number; pageSize: number }
  ): Promise<{ items: WebsiteSite[]; total: number }> {
    const where: any = { tenantId };
    if (params.q) {
      where.OR = [{ name: { contains: params.q, mode: "insensitive" } }];
    }

    const skip = (params.page - 1) * params.pageSize;
    const take = params.pageSize;

    const [items, total] = await Promise.all([
      this.prisma.websiteSite.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take,
      }),
      this.prisma.websiteSite.count({ where }),
    ]);

    return { items: items.map(mapSite), total };
  }
}
