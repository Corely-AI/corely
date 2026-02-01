import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Prisma, PortfolioService as PortfolioServiceModel } from "@prisma/client";
import type {
  ServiceRepositoryPort,
  ServiceListFilters,
  ServiceListResult,
} from "../../application/ports/service-repository.port";
import type { PortfolioService } from "../../domain/portfolio.types";
import { toOrderBy } from "./portfolio-prisma.utils";

const mapService = (row: PortfolioServiceModel): PortfolioService => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  showcaseId: row.showcaseId,
  name: row.name,
  slug: row.slug,
  shortDescription: row.shortDescription,
  deliverables: row.deliverables ?? [],
  startingFromPrice: row.startingFromPrice,
  ctaText: row.ctaText,
  ctaUrl: row.ctaUrl,
  status: row.status,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaServiceRepository implements ServiceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: Omit<PortfolioService, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioService> {
    const row = await this.prisma.portfolioService.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        showcaseId: input.showcaseId,
        name: input.name,
        slug: input.slug,
        shortDescription: input.shortDescription,
        deliverables: input.deliverables ?? [],
        startingFromPrice: input.startingFromPrice ?? null,
        ctaText: input.ctaText ?? null,
        ctaUrl: input.ctaUrl ?? null,
        status: input.status,
        sortOrder: input.sortOrder ?? null,
      },
    });
    return mapService(row);
  }

  async update(
    tenantId: string,
    workspaceId: string,
    serviceId: string,
    input: Partial<Omit<PortfolioService, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">>
  ): Promise<PortfolioService> {
    const row = await this.prisma.portfolioService.update({
      where: { id: serviceId },
      data: {
        name: input.name,
        slug: input.slug,
        shortDescription: input.shortDescription,
        deliverables: input.deliverables,
        startingFromPrice: input.startingFromPrice,
        ctaText: input.ctaText,
        ctaUrl: input.ctaUrl,
        status: input.status,
        sortOrder: input.sortOrder,
      },
    });
    return mapService(row);
  }

  async findById(
    tenantId: string,
    workspaceId: string,
    serviceId: string
  ): Promise<PortfolioService | null> {
    const row = await this.prisma.portfolioService.findFirst({
      where: { id: serviceId, tenantId, workspaceId },
    });
    return row ? mapService(row) : null;
  }

  async findBySlug(showcaseId: string, slug: string): Promise<PortfolioService | null> {
    const row = await this.prisma.portfolioService.findFirst({ where: { showcaseId, slug } });
    return row ? mapService(row) : null;
  }

  async listByShowcase(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    filters: ServiceListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<ServiceListResult> {
    const where: Prisma.PortfolioServiceWhereInput = { tenantId, workspaceId, showcaseId };

    if (filters.publishedOnly) {
      where.status = "published";
    } else if (filters.status) {
      where.status = filters.status;
    }

    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const total = await this.prisma.portfolioService.count({ where });
    const orderBy = toOrderBy(filters.sort, ["createdAt", "updatedAt", "name", "sortOrder"], {
      field: "createdAt",
      direction: "desc",
    });

    const items = await this.prisma.portfolioService.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return { items: items.map(mapService), total };
  }

  async delete(tenantId: string, workspaceId: string, serviceId: string): Promise<void> {
    await this.prisma.portfolioService.delete({ where: { id: serviceId } });
  }
}
