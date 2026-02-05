import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { Prisma } from "@prisma/client";
import type { WebsitePage, WebsitePageStatus } from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../../application/ports/page-repository.port";

const mapPage = (row: any): WebsitePage => ({
  id: row.id,
  tenantId: row.tenantId,
  siteId: row.siteId,
  path: row.path,
  locale: row.locale,
  template: row.template,
  status: row.status,
  cmsEntryId: row.cmsEntryId,
  seoTitle: row.seoTitle ?? null,
  seoDescription: row.seoDescription ?? null,
  seoImageFileId: row.seoImageFileId ?? null,
  publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class PrismaWebsitePageRepository implements WebsitePageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(page: WebsitePage, tx?: TransactionContext): Promise<WebsitePage> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websitePage.create({
      data: {
        id: page.id,
        tenantId: page.tenantId,
        siteId: page.siteId,
        path: page.path,
        locale: page.locale,
        template: page.template,
        status: page.status,
        cmsEntryId: page.cmsEntryId,
        seoTitle: page.seoTitle ?? undefined,
        seoDescription: page.seoDescription ?? undefined,
        seoImageFileId: page.seoImageFileId ?? undefined,
        publishedAt: page.publishedAt ? new Date(page.publishedAt) : null,
      },
    });
    return mapPage(row);
  }

  async update(page: WebsitePage, tx?: TransactionContext): Promise<WebsitePage> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websitePage.update({
      where: { id: page.id },
      data: {
        path: page.path,
        locale: page.locale,
        template: page.template,
        status: page.status,
        cmsEntryId: page.cmsEntryId,
        seoTitle: page.seoTitle ?? undefined,
        seoDescription: page.seoDescription ?? undefined,
        seoImageFileId: page.seoImageFileId ?? undefined,
        publishedAt: page.publishedAt ? new Date(page.publishedAt) : null,
      },
    });
    return mapPage(row);
  }

  async findById(
    tenantId: string,
    pageId: string,
    tx?: TransactionContext
  ): Promise<WebsitePage | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.websitePage.findFirst({ where: { id: pageId, tenantId } });
    return row ? mapPage(row) : null;
  }

  async findByPath(
    tenantId: string,
    siteId: string,
    path: string,
    locale: string
  ): Promise<WebsitePage | null> {
    const row = await this.prisma.websitePage.findFirst({
      where: { tenantId, siteId, path, locale },
    });
    return row ? mapPage(row) : null;
  }

  async list(
    tenantId: string,
    params: {
      siteId: string;
      status?: WebsitePageStatus;
      q?: string;
      page: number;
      pageSize: number;
      sort?: string | string[];
    }
  ): Promise<{ items: WebsitePage[]; total: number }> {
    const where: any = { tenantId, siteId: params.siteId };
    if (params.status) {
      where.status = params.status;
    }
    if (params.q) {
      where.OR = [
        { path: { contains: params.q, mode: "insensitive" } },
        { template: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const skip = (params.page - 1) * params.pageSize;
    const take = params.pageSize;

    const orderBy = resolveSort(params.sort);

    const [rows, total] = await Promise.all([
      this.prisma.websitePage.findMany({ where, orderBy, skip, take }),
      this.prisma.websitePage.count({ where }),
    ]);

    return { items: rows.map(mapPage), total };
  }
}

const resolveSort = (sort?: string | string[]): Prisma.WebsitePageOrderByWithRelationInput[] => {
  const fallback: Prisma.WebsitePageOrderByWithRelationInput[] = [{ updatedAt: "desc" }];
  if (!sort) {
    return fallback;
  }
  const value = Array.isArray(sort) ? sort[0] : sort;
  if (!value) {
    return fallback;
  }
  const [field, dir] = value.split(":");
  const direction: Prisma.SortOrder = dir === "asc" ? "asc" : "desc";
  const map: Record<string, keyof Prisma.WebsitePageOrderByWithRelationInput> = {
    path: "path",
    template: "template",
    status: "status",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    publishedAt: "publishedAt",
  };
  const mapped = map[field] ?? "updatedAt";
  return [{ [mapped]: direction } as Prisma.WebsitePageOrderByWithRelationInput];
};
