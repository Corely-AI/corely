import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Prisma, PortfolioProject as PortfolioProjectModel } from "@prisma/client";
import type {
  ProjectRepositoryPort,
  ProjectListFilters,
  ProjectListResult,
} from "../../application/ports/project-repository.port";
import type { PortfolioProject } from "../../domain/portfolio.types";
import { toOrderBy } from "./portfolio-prisma.utils";

const mapProject = (row: PortfolioProjectModel): PortfolioProject => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  showcaseId: row.showcaseId,
  title: row.title,
  slug: row.slug,
  summary: row.summary,
  content: row.content,
  type: row.type,
  status: row.status,
  featured: row.featured,
  sortOrder: row.sortOrder,
  coverImageUrl: row.coverImageUrl,
  links: row.links as Record<string, string> | null,
  techStack: row.techStack ?? [],
  metrics: row.metrics as Record<string, unknown> | null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaProjectRepository implements ProjectRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: Omit<PortfolioProject, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioProject> {
    const row = await this.prisma.portfolioProject.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        showcaseId: input.showcaseId,
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        content: input.content,
        type: input.type,
        status: input.status,
        featured: input.featured,
        sortOrder: input.sortOrder ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        links: input.links ?? null,
        techStack: input.techStack ?? [],
        metrics: (input.metrics ?? null) as Prisma.InputJsonValue,
      },
    });
    return mapProject(row);
  }

  async update(
    tenantId: string,
    workspaceId: string,
    projectId: string,
    input: Partial<
      Omit<PortfolioProject, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioProject> {
    const row = await this.prisma.portfolioProject.update({
      where: { id: projectId },
      data: {
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        content: input.content,
        type: input.type,
        status: input.status,
        featured: input.featured,
        sortOrder: input.sortOrder,
        coverImageUrl: input.coverImageUrl,
        links: input.links,
        techStack: input.techStack,
        metrics: input.metrics as Prisma.InputJsonValue | undefined,
      },
    });
    return mapProject(row);
  }

  async findById(
    tenantId: string,
    workspaceId: string,
    projectId: string
  ): Promise<PortfolioProject | null> {
    const row = await this.prisma.portfolioProject.findFirst({
      where: { id: projectId, tenantId, workspaceId },
    });
    return row ? mapProject(row) : null;
  }

  async findBySlug(
    showcaseId: string,
    slug: string,
    opts?: { publishedOnly?: boolean }
  ): Promise<PortfolioProject | null> {
    const where: Prisma.PortfolioProjectWhereInput = { showcaseId, slug };
    if (opts?.publishedOnly) {
      where.status = "published";
    }
    const row = await this.prisma.portfolioProject.findFirst({ where });
    return row ? mapProject(row) : null;
  }

  async listByShowcase(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    filters: ProjectListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<ProjectListResult> {
    const where: Prisma.PortfolioProjectWhereInput = {
      tenantId,
      workspaceId,
      showcaseId,
    };

    if (filters.publishedOnly) {
      where.status = "published";
    } else if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (typeof filters.featured === "boolean") {
      where.featured = filters.featured;
    }

    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: "insensitive" } },
        { summary: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const total = await this.prisma.portfolioProject.count({ where });
    const orderBy = toOrderBy(filters.sort, ["createdAt", "updatedAt", "title", "sortOrder"], {
      field: "createdAt",
      direction: "desc",
    });

    const items = await this.prisma.portfolioProject.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return { items: items.map(mapProject), total };
  }

  async delete(tenantId: string, workspaceId: string, projectId: string): Promise<void> {
    await this.prisma.portfolioProject.delete({ where: { id: projectId } });
  }

  async setClients(
    tenantId: string,
    workspaceId: string,
    projectId: string,
    clientIds: string[]
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.portfolioProjectClient.deleteMany({
        where: { projectId, tenantId, workspaceId },
      });

      if (clientIds.length > 0) {
        await tx.portfolioProjectClient.createMany({
          data: clientIds.map((clientId) => ({
            projectId,
            clientId,
            tenantId,
            workspaceId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  async listClientIds(tenantId: string, workspaceId: string, projectId: string): Promise<string[]> {
    const rows = await this.prisma.portfolioProjectClient.findMany({
      where: { projectId, tenantId, workspaceId },
      select: { clientId: true },
    });
    return rows.map((row) => row.clientId);
  }
}
