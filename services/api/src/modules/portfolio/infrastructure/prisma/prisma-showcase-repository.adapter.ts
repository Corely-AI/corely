import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Prisma, PortfolioShowcase as PortfolioShowcaseModel } from "@prisma/client";
import type {
  ShowcaseRepositoryPort,
  ShowcaseListFilters,
  ShowcaseListResult,
} from "../../application/ports/showcase-repository.port";
import type { PortfolioShowcase } from "../../domain/portfolio.types";
import { toOrderBy } from "./portfolio-prisma.utils";

const mapShowcase = (row: PortfolioShowcaseModel): PortfolioShowcase => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  type: row.type,
  name: row.name,
  slug: row.slug,
  primaryDomain: row.primaryDomain,
  isPublished: row.isPublished,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaShowcaseRepository implements ShowcaseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: Omit<PortfolioShowcase, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioShowcase> {
    const row = await this.prisma.portfolioShowcase.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        type: input.type,
        name: input.name,
        slug: input.slug,
        primaryDomain: input.primaryDomain ?? null,
        isPublished: input.isPublished,
      },
    });
    return mapShowcase(row);
  }

  async update(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    input: Partial<
      Omit<PortfolioShowcase, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioShowcase> {
    const row = await this.prisma.portfolioShowcase.update({
      where: { id: showcaseId },
      data: {
        type: input.type,
        name: input.name,
        slug: input.slug,
        primaryDomain: input.primaryDomain,
        isPublished: input.isPublished,
      },
    });
    return mapShowcase(row);
  }

  async findById(
    tenantId: string,
    workspaceId: string,
    showcaseId: string
  ): Promise<PortfolioShowcase | null> {
    const row = await this.prisma.portfolioShowcase.findFirst({
      where: { id: showcaseId, tenantId, workspaceId },
    });
    return row ? mapShowcase(row) : null;
  }

  async findBySlug(
    tenantId: string,
    workspaceId: string,
    slug: string,
    opts?: { publishedOnly?: boolean }
  ): Promise<PortfolioShowcase | null> {
    const where: Prisma.PortfolioShowcaseWhereInput = { tenantId, workspaceId, slug };
    if (opts?.publishedOnly) {
      where.isPublished = true;
    }
    const row = await this.prisma.portfolioShowcase.findFirst({ where });
    return row ? mapShowcase(row) : null;
  }

  async list(
    tenantId: string,
    workspaceId: string,
    filters: ShowcaseListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<ShowcaseListResult> {
    const where: Prisma.PortfolioShowcaseWhereInput = { tenantId, workspaceId };

    if (filters.type) {
      where.type = filters.type;
    }
    if (typeof filters.isPublished === "boolean") {
      where.isPublished = filters.isPublished;
    }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const total = await this.prisma.portfolioShowcase.count({ where });
    const orderBy = toOrderBy(filters.sort, ["createdAt", "updatedAt", "name"], {
      field: "createdAt",
      direction: "desc",
    });

    const items = await this.prisma.portfolioShowcase.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return { items: items.map(mapShowcase), total };
  }

  async delete(tenantId: string, workspaceId: string, showcaseId: string): Promise<void> {
    await this.prisma.portfolioShowcase.delete({
      where: { id: showcaseId },
    });
  }
}
