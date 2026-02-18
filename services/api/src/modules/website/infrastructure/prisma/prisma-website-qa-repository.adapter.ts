import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  CreateWebsiteQaRecord,
  ListPublishedWebsiteQaParams,
  ListWebsiteQaForSiteParams,
  PublicWebsiteQaItem,
  UpdateWebsiteQaRecord,
  WebsiteQaItem,
  WebsiteQaRepositoryPort,
  WebsiteQaScope,
  WebsiteQaStatus,
} from "../../application/ports/qa-repository.port";

const mapScopeToPrisma = (scope: WebsiteQaScope): "SITE" | "PAGE" =>
  scope === "page" ? "PAGE" : "SITE";

const mapScopeFromPrisma = (scope: "SITE" | "PAGE"): WebsiteQaScope =>
  scope === "PAGE" ? "page" : "site";

const mapStatusToPrisma = (status: WebsiteQaStatus): "DRAFT" | "PUBLISHED" =>
  status === "published" ? "PUBLISHED" : "DRAFT";

const mapStatusFromPrisma = (status: "DRAFT" | "PUBLISHED"): WebsiteQaStatus =>
  status === "PUBLISHED" ? "published" : "draft";

const mapItem = (row: {
  id: string;
  tenantId: string;
  siteId: string;
  locale: string;
  scope: "SITE" | "PAGE";
  pageId: string | null;
  status: "DRAFT" | "PUBLISHED";
  order: number;
  question: string;
  answerHtml: string;
  createdAt: Date;
  updatedAt: Date;
}): WebsiteQaItem => ({
  id: row.id,
  tenantId: row.tenantId,
  siteId: row.siteId,
  locale: row.locale,
  scope: mapScopeFromPrisma(row.scope),
  pageId: row.pageId,
  status: mapStatusFromPrisma(row.status),
  order: row.order,
  question: row.question,
  answerHtml: row.answerHtml,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class PrismaWebsiteQaRepository implements WebsiteQaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(params: ListPublishedWebsiteQaParams): Promise<PublicWebsiteQaItem[]> {
    const rows = await this.prisma.websiteQa.findMany({
      where: {
        tenantId: params.tenantId,
        siteId: params.siteId,
        locale: params.locale,
        scope: mapScopeToPrisma(params.scope) as unknown as never,
        status: "PUBLISHED" as unknown as never,
        ...(params.scope === "page" ? { pageId: params.pageId ?? null } : {}),
      },
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => {
      const item = mapItem(row as never);
      return {
        id: item.id,
        question: item.question,
        answerHtml: item.answerHtml,
        order: item.order,
        updatedAt: item.updatedAt,
        locale: item.locale,
      };
    });
  }

  async listForSite(params: ListWebsiteQaForSiteParams): Promise<WebsiteQaItem[]> {
    const rows = await this.prisma.websiteQa.findMany({
      where: {
        tenantId: params.tenantId,
        siteId: params.siteId,
        ...(params.locale ? { locale: params.locale } : {}),
        ...(params.scope ? { scope: mapScopeToPrisma(params.scope) as unknown as never } : {}),
        ...(params.pageId ? { pageId: params.pageId } : {}),
        ...(params.status ? { status: mapStatusToPrisma(params.status) as unknown as never } : {}),
      },
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => mapItem(row as never));
  }

  async findById(tenantId: string, siteId: string, qaId: string): Promise<WebsiteQaItem | null> {
    const row = await this.prisma.websiteQa.findFirst({
      where: {
        id: qaId,
        tenantId,
        siteId,
      },
    });

    return row ? mapItem(row as never) : null;
  }

  async create(record: CreateWebsiteQaRecord): Promise<WebsiteQaItem> {
    const row = await this.prisma.websiteQa.create({
      data: {
        id: record.id,
        tenantId: record.tenantId,
        siteId: record.siteId,
        locale: record.locale,
        scope: mapScopeToPrisma(record.scope) as unknown as never,
        pageId: record.scope === "page" ? (record.pageId ?? null) : null,
        status: mapStatusToPrisma(record.status) as unknown as never,
        order: record.order,
        question: record.question,
        answerHtml: record.answerHtml,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });

    return mapItem(row as never);
  }

  async update(record: UpdateWebsiteQaRecord): Promise<WebsiteQaItem> {
    const row = await this.prisma.websiteQa.update({
      where: { id: record.id },
      data: {
        locale: record.locale,
        scope: mapScopeToPrisma(record.scope) as unknown as never,
        pageId: record.scope === "page" ? (record.pageId ?? null) : null,
        status: mapStatusToPrisma(record.status) as unknown as never,
        order: record.order,
        question: record.question,
        answerHtml: record.answerHtml,
        updatedAt: new Date(record.updatedAt),
      },
    });

    return mapItem(row as never);
  }

  async delete(tenantId: string, siteId: string, qaId: string): Promise<void> {
    await this.prisma.websiteQa.deleteMany({
      where: {
        id: qaId,
        tenantId,
        siteId,
      },
    });
  }
}
