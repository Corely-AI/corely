import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  ResourceRepositoryPort,
  ResourceFilters,
  ResourcePage,
} from "../../application/ports/booking-repo.ports";
import { BookingResource, type ResourceType } from "../../domain/booking.entities";
import { Prisma, BookingResourceType } from "@prisma/client";

@Injectable()
export class PrismaResourceRepoAdapter implements ResourceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: any): BookingResource {
    return new BookingResource(
      row.id,
      row.tenantId,
      row.workspaceId,
      row.type as ResourceType,
      row.name,
      row.description,
      row.location,
      row.capacity,
      row.tags,
      row.attributes as Record<string, unknown>,
      row.isActive,
      row.createdAt,
      row.updatedAt
    );
  }

  async create(resource: BookingResource): Promise<BookingResource> {
    const created = await this.prisma.bookingResource.create({
      data: {
        id: resource.id,
        tenantId: resource.tenantId,
        workspaceId: resource.workspaceId,
        type: resource.type as BookingResourceType,
        name: resource.name,
        description: resource.description,
        location: resource.location,
        capacity: resource.capacity,
        tags: resource.tags,
        attributes: (resource.attributes || Prisma.JsonNull) as Prisma.InputJsonValue,
        isActive: resource.isActive,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      },
    });
    return this.mapToDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<BookingResource | null> {
    const row = await this.prisma.bookingResource.findUnique({
      where: { id, tenantId },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async findMany(
    tenantId: string,
    filters: ResourceFilters,
    page: number,
    pageSize: number
  ): Promise<ResourcePage> {
    const where: Prisma.BookingResourceWhereInput = { tenantId };

    if (filters.q) {
      where.name = { contains: filters.q, mode: "insensitive" };
    }
    if (filters.type) {
      where.type = filters.type as BookingResourceType;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.bookingResource.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      this.prisma.bookingResource.count({ where }),
    ]);

    return {
      items: items.map(this.mapToDomain),
      total,
    };
  }

  async update(resource: BookingResource): Promise<BookingResource> {
    const updated = await this.prisma.bookingResource.update({
      where: { id: resource.id, tenantId: resource.tenantId },
      data: {
        type: resource.type as BookingResourceType,
        name: resource.name,
        description: resource.description,
        location: resource.location,
        capacity: resource.capacity,
        tags: resource.tags,
        attributes: (resource.attributes || Prisma.JsonNull) as Prisma.InputJsonValue,
        isActive: resource.isActive,
        updatedAt: resource.updatedAt,
      },
    });
    return this.mapToDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.bookingResource.delete({
      where: { id, tenantId },
    });
  }
}
