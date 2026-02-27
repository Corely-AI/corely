import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  ServiceRepositoryPort,
  ServiceFilters,
  ServicePage,
} from "../../application/ports/booking-repo.ports";
import { ServiceOffering, type ResourceType } from "../../domain/booking.entities";
import { Prisma } from "@prisma/client";

@Injectable()
export class PrismaServiceRepoAdapter implements ServiceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: any): ServiceOffering {
    return new ServiceOffering(
      row.id,
      row.tenantId,
      row.workspaceId,
      row.name,
      row.description,
      row.durationMinutes,
      row.bufferBeforeMinutes,
      row.bufferAfterMinutes,
      row.priceCents,
      row.currency,
      row.depositCents,
      row.requiredResourceTypes as ResourceType[],
      row.requiredTags,
      row.isActive,
      row.createdAt,
      row.updatedAt
    );
  }

  async create(service: ServiceOffering): Promise<ServiceOffering> {
    const created = await this.prisma.bookingServiceOffering.create({
      data: {
        id: service.id,
        tenantId: service.tenantId,
        workspaceId: service.workspaceId,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
        priceCents: service.priceCents,
        currency: service.currency,
        depositCents: service.depositCents,
        requiredResourceTypes: service.requiredResourceTypes,
        requiredTags: service.requiredTags,
        isActive: service.isActive,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      },
    });
    return this.mapToDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<ServiceOffering | null> {
    const row = await this.prisma.bookingServiceOffering.findUnique({
      where: { id, tenantId },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async findMany(
    tenantId: string,
    filters: ServiceFilters,
    page: number,
    pageSize: number
  ): Promise<ServicePage> {
    const where: Prisma.BookingServiceOfferingWhereInput = { tenantId };

    if (filters.q) {
      where.name = { contains: filters.q, mode: "insensitive" };
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.bookingServiceOffering.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      this.prisma.bookingServiceOffering.count({ where }),
    ]);

    return {
      items: items.map(this.mapToDomain),
      total,
    };
  }

  async update(service: ServiceOffering): Promise<ServiceOffering> {
    const updated = await this.prisma.bookingServiceOffering.update({
      where: { id: service.id, tenantId: service.tenantId },
      data: {
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
        priceCents: service.priceCents,
        currency: service.currency,
        depositCents: service.depositCents,
        requiredResourceTypes: service.requiredResourceTypes,
        requiredTags: service.requiredTags,
        isActive: service.isActive,
        updatedAt: service.updatedAt,
      },
    });
    return this.mapToDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.bookingServiceOffering.delete({
      where: { id, tenantId },
    });
  }
}
