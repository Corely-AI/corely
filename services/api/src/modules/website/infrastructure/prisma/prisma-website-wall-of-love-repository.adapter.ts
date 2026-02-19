import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  CreateWebsiteWallOfLoveItemRecord,
  ListWebsiteWallOfLoveItemsParams,
  UpdateWebsiteWallOfLoveItemRecord,
  WebsiteWallOfLoveItemRecord,
  WebsiteWallOfLoveRepositoryPort,
} from "../../application/ports/wall-of-love-repository.port";

const mapTypeToPrisma = (type: "image" | "youtube" | "x"): "IMAGE" | "YOUTUBE" | "X" => {
  if (type === "youtube") {
    return "YOUTUBE";
  }
  if (type === "x") {
    return "X";
  }
  return "IMAGE";
};

const mapTypeFromPrisma = (type: "IMAGE" | "YOUTUBE" | "X"): "image" | "youtube" | "x" => {
  if (type === "YOUTUBE") {
    return "youtube";
  }
  if (type === "X") {
    return "x";
  }
  return "image";
};

const mapStatusToPrisma = (status: "draft" | "published"): "DRAFT" | "PUBLISHED" =>
  status === "published" ? "PUBLISHED" : "DRAFT";

const mapStatusFromPrisma = (status: "DRAFT" | "PUBLISHED"): "draft" | "published" =>
  status === "PUBLISHED" ? "published" : "draft";

const mapRecord = (row: {
  id: string;
  tenantId: string;
  siteId: string;
  type: "IMAGE" | "YOUTUBE" | "X";
  status: "DRAFT" | "PUBLISHED";
  order: number;
  quote: string | null;
  authorName: string | null;
  authorTitle: string | null;
  sourceLabel: string | null;
  linkUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WebsiteWallOfLoveItemRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  siteId: row.siteId,
  type: mapTypeFromPrisma(row.type),
  status: mapStatusFromPrisma(row.status),
  order: row.order,
  quote: row.quote,
  authorName: row.authorName,
  authorTitle: row.authorTitle,
  sourceLabel: row.sourceLabel,
  linkUrl: row.linkUrl,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class PrismaWebsiteWallOfLoveRepository implements WebsiteWallOfLoveRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listForSite(
    params: ListWebsiteWallOfLoveItemsParams
  ): Promise<WebsiteWallOfLoveItemRecord[]> {
    const rows = await this.prisma.websiteWallOfLoveItem.findMany({
      where: {
        tenantId: params.tenantId,
        siteId: params.siteId,
        ...(params.status ? { status: mapStatusToPrisma(params.status) as unknown as never } : {}),
      },
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => mapRecord(row as never));
  }

  async listPublishedBySiteId(siteId: string): Promise<WebsiteWallOfLoveItemRecord[]> {
    const rows = await this.prisma.websiteWallOfLoveItem.findMany({
      where: {
        siteId,
        status: "PUBLISHED" as unknown as never,
      },
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => mapRecord(row as never));
  }

  async findById(tenantId: string, itemId: string): Promise<WebsiteWallOfLoveItemRecord | null> {
    const row = await this.prisma.websiteWallOfLoveItem.findFirst({
      where: {
        id: itemId,
        tenantId,
      },
    });
    return row ? mapRecord(row as never) : null;
  }

  async create(record: CreateWebsiteWallOfLoveItemRecord): Promise<WebsiteWallOfLoveItemRecord> {
    const row = await this.prisma.websiteWallOfLoveItem.create({
      data: {
        id: record.id,
        tenantId: record.tenantId,
        siteId: record.siteId,
        type: mapTypeToPrisma(record.type) as unknown as never,
        status: mapStatusToPrisma(record.status) as unknown as never,
        order: record.order,
        quote: record.quote ?? null,
        authorName: record.authorName ?? null,
        authorTitle: record.authorTitle ?? null,
        sourceLabel: record.sourceLabel ?? null,
        linkUrl: record.linkUrl ?? null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return mapRecord(row as never);
  }

  async update(record: UpdateWebsiteWallOfLoveItemRecord): Promise<WebsiteWallOfLoveItemRecord> {
    const row = await this.prisma.websiteWallOfLoveItem.update({
      where: { id: record.id },
      data: {
        type: mapTypeToPrisma(record.type) as unknown as never,
        status: mapStatusToPrisma(record.status) as unknown as never,
        order: record.order,
        quote: record.quote ?? null,
        authorName: record.authorName ?? null,
        authorTitle: record.authorTitle ?? null,
        sourceLabel: record.sourceLabel ?? null,
        linkUrl: record.linkUrl ?? null,
        updatedAt: new Date(record.updatedAt),
      },
    });
    return mapRecord(row as never);
  }

  async reorder(
    tenantId: string,
    siteId: string,
    orderedIds: string[],
    updatedAt: string
  ): Promise<void> {
    const timestamp = new Date(updatedAt);
    await this.prisma.$transaction(
      orderedIds.map((itemId, index) =>
        this.prisma.websiteWallOfLoveItem.updateMany({
          where: { id: itemId, tenantId, siteId },
          data: { order: index, updatedAt: timestamp },
        })
      )
    );
  }

  async nextOrder(tenantId: string, siteId: string): Promise<number> {
    const aggregate = await this.prisma.websiteWallOfLoveItem.aggregate({
      where: { tenantId, siteId },
      _max: { order: true },
    });
    return (aggregate._max.order ?? -1) + 1;
  }
}
