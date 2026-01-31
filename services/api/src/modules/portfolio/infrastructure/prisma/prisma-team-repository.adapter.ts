import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Prisma, PortfolioTeamMember as PortfolioTeamMemberModel } from "@prisma/client";
import type {
  TeamRepositoryPort,
  TeamListFilters,
  TeamListResult,
} from "../../application/ports/team-repository.port";
import type { PortfolioTeamMember } from "../../domain/portfolio.types";
import { toOrderBy } from "./portfolio-prisma.utils";

const mapTeamMember = (row: PortfolioTeamMemberModel): PortfolioTeamMember => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  showcaseId: row.showcaseId,
  name: row.name,
  roleTitle: row.roleTitle,
  bio: row.bio,
  skills: row.skills ?? [],
  photoUrl: row.photoUrl,
  socialLinks: row.socialLinks,
  status: row.status,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaTeamRepository implements TeamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: Omit<PortfolioTeamMember, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioTeamMember> {
    const row = await this.prisma.portfolioTeamMember.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        showcaseId: input.showcaseId,
        name: input.name,
        roleTitle: input.roleTitle,
        bio: input.bio,
        skills: input.skills ?? [],
        photoUrl: input.photoUrl ?? null,
        socialLinks: input.socialLinks ?? null,
        status: input.status,
        sortOrder: input.sortOrder ?? null,
      },
    });
    return mapTeamMember(row);
  }

  async update(
    tenantId: string,
    workspaceId: string,
    memberId: string,
    input: Partial<Omit<PortfolioTeamMember, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">>
  ): Promise<PortfolioTeamMember> {
    const row = await this.prisma.portfolioTeamMember.update({
      where: { id: memberId },
      data: {
        name: input.name,
        roleTitle: input.roleTitle,
        bio: input.bio,
        skills: input.skills,
        photoUrl: input.photoUrl,
        socialLinks: input.socialLinks,
        status: input.status,
        sortOrder: input.sortOrder,
      },
    });
    return mapTeamMember(row);
  }

  async findById(
    tenantId: string,
    workspaceId: string,
    memberId: string
  ): Promise<PortfolioTeamMember | null> {
    const row = await this.prisma.portfolioTeamMember.findFirst({
      where: { id: memberId, tenantId, workspaceId },
    });
    return row ? mapTeamMember(row) : null;
  }

  async listByShowcase(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    filters: TeamListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<TeamListResult> {
    const where: Prisma.PortfolioTeamMemberWhereInput = { tenantId, workspaceId, showcaseId };

    if (filters.publishedOnly) {
      where.status = "published";
    } else if (filters.status) {
      where.status = filters.status;
    }

    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { roleTitle: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const total = await this.prisma.portfolioTeamMember.count({ where });
    const orderBy = toOrderBy(filters.sort, ["createdAt", "updatedAt", "name", "sortOrder"], {
      field: "createdAt",
      direction: "desc",
    });

    const items = await this.prisma.portfolioTeamMember.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    return { items: items.map(mapTeamMember), total };
  }

  async delete(tenantId: string, workspaceId: string, memberId: string): Promise<void> {
    await this.prisma.portfolioTeamMember.delete({ where: { id: memberId } });
  }
}
