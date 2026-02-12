import { Injectable, Inject } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "@corely/data";
import { Tenant } from "../../domain/entities/tenant.entity";
import {
  type ListTenantsRepoQuery,
  type ListTenantsRepoResult,
  TenantRepositoryPort,
} from "../../application/ports/tenant-repository.port";

/**
 * Prisma Tenant Repository Implementation
 */
@Injectable()
export class PrismaTenantRepository implements TenantRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(tenant: Tenant): Promise<Tenant> {
    const data = await this.prisma.tenant.create({
      data: {
        id: tenant.getId(),
        name: tenant.getName(),
        slug: tenant.getSlug(),
        status: tenant.getStatus(),
        createdAt: tenant.getCreatedAt(),
      },
    });

    return Tenant.restore(data);
  }

  async findById(id: string): Promise<Tenant | null> {
    const data = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }
    return Tenant.restore(data);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const data = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!data) {
      return null;
    }
    return Tenant.restore(data);
  }

  async listAll(query: ListTenantsRepoQuery): Promise<ListTenantsRepoResult> {
    const where: Prisma.TenantWhereInput = {};

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [sortFieldRaw, sortDirectionRaw] = (query.sort ?? "createdAt:desc").split(":");
    const sortDirection: Prisma.SortOrder =
      sortDirectionRaw?.toLowerCase() === "asc" ? "asc" : "desc";
    const sortField = ["name", "slug", "status", "createdAt"].includes(sortFieldRaw)
      ? sortFieldRaw
      : "createdAt";
    const orderBy: Prisma.TenantOrderByWithRelationInput = { [sortField]: sortDirection };

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      items: rows.map((row) => Tenant.restore(row)),
      total,
    };
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.tenant.count({
      where: { slug },
    });

    return count > 0;
  }

  async update(tenant: Tenant): Promise<Tenant> {
    const data = await this.prisma.tenant.update({
      where: { id: tenant.getId() },
      data: {
        name: tenant.getName(),
        slug: tenant.getSlug(),
        status: tenant.getStatus(),
      },
    });

    return Tenant.restore(data);
  }
}
