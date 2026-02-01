import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Prisma, PortfolioClient as PortfolioClientModel } from "@prisma/client";
import type {
  ClientRepositoryPort,
  ClientListFilters,
  ClientListResult,
} from "../../application/ports/client-repository.port";
import type { PortfolioClient } from "../../domain/portfolio.types";
import { toOrderBy } from "./portfolio-prisma.utils";

const mapClient = (row: PortfolioClientModel): PortfolioClient => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  showcaseId: row.showcaseId,
  name: row.name,
  slug: row.slug,
  clientType: row.clientType,
  locationText: row.locationText,
  websiteUrl: row.websiteUrl,
  logoImageUrl: row.logoImageUrl,
  summary: row.summary,
  testimonialQuote: row.testimonialQuote,
  testimonialAuthor: row.testimonialAuthor,
  featured: row.featured,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaClientRepository implements ClientRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: Omit<PortfolioClient, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioClient> {
    const row = await this.prisma.portfolioClient.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        showcaseId: input.showcaseId,
        name: input.name,
        slug: input.slug,
        clientType: input.clientType,
        locationText: input.locationText,
        websiteUrl: input.websiteUrl ?? null,
        logoImageUrl: input.logoImageUrl ?? null,
        summary: input.summary ?? null,
        testimonialQuote: input.testimonialQuote ?? null,
        testimonialAuthor: input.testimonialAuthor ?? null,
        featured: input.featured,
        sortOrder: input.sortOrder ?? null,
      },
    });
    return mapClient(row);
  }

  async update(
    tenantId: string,
    workspaceId: string,
    clientId: string,
    input: Partial<Omit<PortfolioClient, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">>
  ): Promise<PortfolioClient> {
    const row = await this.prisma.portfolioClient.update({
      where: { id: clientId },
      data: {
        name: input.name,
        slug: input.slug,
        clientType: input.clientType,
        locationText: input.locationText,
        websiteUrl: input.websiteUrl,
        logoImageUrl: input.logoImageUrl,
        summary: input.summary,
        testimonialQuote: input.testimonialQuote,
        testimonialAuthor: input.testimonialAuthor,
        featured: input.featured,
        sortOrder: input.sortOrder,
      },
    });
    return mapClient(row);
  }

  async findById(
    tenantId: string,
    workspaceId: string,
    clientId: string
  ): Promise<PortfolioClient | null> {
    const row = await this.prisma.portfolioClient.findFirst({
      where: { id: clientId, tenantId, workspaceId },
    });
    return row ? mapClient(row) : null;
  }

  async findBySlug(showcaseId: string, slug: string): Promise<PortfolioClient | null> {
    const row = await this.prisma.portfolioClient.findFirst({ where: { showcaseId, slug } });
    return row ? mapClient(row) : null;
  }

  async listByShowcase(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    filters: ClientListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<ClientListResult> {
    const where: Prisma.PortfolioClientWhereInput = {
      tenantId,
      workspaceId,
      showcaseId,
    };

    if (filters.featuredOnly) {
      where.featured = true;
    } else if (typeof filters.featured === "boolean") {
      where.featured = filters.featured;
    }

    if (filters.clientType) {
      where.clientType = filters.clientType;
    }

    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const total = await this.prisma.portfolioClient.count({ where });
    const orderBy = toOrderBy(filters.sort, ["createdAt", "updatedAt", "name", "sortOrder"], {
      field: "createdAt",
      direction: "desc",
    });

    const items = await this.prisma.portfolioClient.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return { items: items.map(mapClient), total };
  }

  async delete(tenantId: string, workspaceId: string, clientId: string): Promise<void> {
    await this.prisma.portfolioClient.delete({ where: { id: clientId } });
  }

  async findByIds(
    tenantId: string,
    workspaceId: string,
    clientIds: string[]
  ): Promise<PortfolioClient[]> {
    const rows = await this.prisma.portfolioClient.findMany({
      where: { tenantId, workspaceId, id: { in: clientIds } },
    });
    return rows.map(mapClient);
  }
}
