import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  BookingRepositoryPort,
  BookingFilters,
  BookingPage,
} from "../../application/ports/booking-repo.ports";
import {
  BookingEntity,
  BookingAllocation,
  type BookingStatus,
  type AllocationRole,
} from "../../domain/booking.entities";
import {
  Prisma,
  BookingStatus as PrismaBookingStatus,
  BookingAllocationRole,
} from "@prisma/client";

@Injectable()
export class PrismaBookingRepoAdapter implements BookingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapAllocations(rows: any[]): BookingAllocation[] {
    if (!rows) {
      return [];
    }
    return rows.map(
      (r) =>
        new BookingAllocation(
          r.id,
          r.tenantId,
          r.bookingId,
          r.resourceId,
          r.role as AllocationRole,
          r.startAt,
          r.endAt,
          r.createdAt
        )
    );
  }

  private mapToDomain(row: any): BookingEntity {
    return new BookingEntity(
      row.id,
      row.tenantId,
      row.workspaceId,
      row.status as BookingStatus,
      row.startAt,
      row.endAt,
      row.referenceNumber,
      row.serviceOfferingId,
      row.bookedByPartyId,
      row.bookedByName,
      row.bookedByEmail,
      row.notes,
      row.holdId,
      row.cancelledAt,
      row.cancelledReason,
      row.createdByUserId,
      row.createdAt,
      row.updatedAt,
      this.mapAllocations(row.allocations)
    );
  }

  async hasConflict(
    tenantId: string,
    resourceId: string,
    startAt: Date,
    endAt: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    // Check Allocations connected to CONFIRMED or HOLD bookings overlapping time
    // An overlap occurs if Allocation.startAt < Request.endAt AND Allocation.endAt > Request.startAt
    const overlapping = await this.prisma.bookingAllocation.findFirst({
      where: {
        tenantId,
        resourceId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeBookingId ? { bookingId: { not: excludeBookingId } } : {}),
        booking: {
          status: { in: ["CONFIRMED", "HOLD"] },
        },
      },
    });

    return !!overlapping;
  }

  async create(booking: BookingEntity, allocations: BookingAllocation[]): Promise<BookingEntity> {
    // Create using a nested transaction
    const created = await this.prisma.$transaction(
      async (tx) => {
        // 1. Conflict check inside TX to guarantee no race double bookings
        for (const alloc of allocations) {
          // Explicitly check inside TX
          const overlapping = await tx.bookingAllocation.findFirst({
            where: {
              tenantId: booking.tenantId,
              resourceId: alloc.resourceId,
              startAt: { lt: alloc.endAt },
              endAt: { gt: alloc.startAt },
              booking: { status: { in: ["CONFIRMED", "HOLD"] } },
            },
          });
          if (overlapping) {
            throw new ConflictException(`Resource ${alloc.resourceId} is no longer available.`);
          }
        }

        // 2. Insert booking with nested allocations
        return tx.booking.create({
          data: {
            id: booking.id,
            tenantId: booking.tenantId,
            workspaceId: booking.workspaceId,
            status: booking.status as BookingStatus,
            startAt: booking.startAt,
            endAt: booking.endAt,
            referenceNumber: booking.referenceNumber,
            serviceOfferingId: booking.serviceOfferingId,
            bookedByPartyId: booking.bookedByPartyId,
            bookedByName: booking.bookedByName,
            bookedByEmail: booking.bookedByEmail,
            notes: booking.notes,
            holdId: booking.holdId,
            cancelledAt: booking.cancelledAt,
            cancelledReason: booking.cancelledReason,
            createdByUserId: booking.createdByUserId,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
            allocations: {
              createMany: {
                data: allocations.map((a) => ({
                  id: a.id,
                  tenantId: a.tenantId,
                  resourceId: a.resourceId,
                  role: a.role as BookingAllocationRole,
                  startAt: a.startAt,
                  endAt: a.endAt,
                  createdAt: a.createdAt,
                })),
              },
            },
          },
          include: { allocations: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    ); // Need stable reads for conflict check

    return this.mapToDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<BookingEntity | null> {
    const row = await this.prisma.booking.findUnique({
      where: { id, tenantId },
      include: { allocations: true },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async findMany(
    tenantId: string,
    filters: BookingFilters,
    page: number,
    pageSize: number
  ): Promise<BookingPage> {
    const where: Prisma.BookingWhereInput = { tenantId };

    if (filters.q) {
      where.OR = [
        { bookedByName: { contains: filters.q, mode: "insensitive" } },
        { referenceNumber: { contains: filters.q, mode: "insensitive" } },
      ];
    }
    if (filters.status) {
      where.status = filters.status as PrismaBookingStatus;
    }
    if (filters.serviceOfferingId) {
      where.serviceOfferingId = filters.serviceOfferingId;
    }
    if (filters.bookedByPartyId) {
      where.bookedByPartyId = filters.bookedByPartyId;
    }
    if (filters.resourceId) {
      where.allocations = { some: { resourceId: filters.resourceId } };
    }
    if (filters.fromDate && filters.toDate) {
      where.startAt = { gte: filters.fromDate, lte: filters.toDate };
    } else if (filters.fromDate) {
      where.startAt = { gte: filters.fromDate };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: { allocations: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startAt: "asc" },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: items.map(this.mapToDomain.bind(this)),
      total,
    };
  }

  async update(booking: BookingEntity): Promise<BookingEntity> {
    const updated = await this.prisma.booking.update({
      where: { id: booking.id, tenantId: booking.tenantId },
      data: {
        status: booking.status as PrismaBookingStatus,
        startAt: booking.startAt,
        endAt: booking.endAt,
        bookedByPartyId: booking.bookedByPartyId,
        bookedByName: booking.bookedByName,
        bookedByEmail: booking.bookedByEmail,
        notes: booking.notes,
        cancelledAt: booking.cancelledAt,
        cancelledReason: booking.cancelledReason,
        updatedAt: booking.updatedAt,
      },
      include: { allocations: true },
    });
    return this.mapToDomain(updated);
  }

  async replaceAllocations(
    bookingId: string,
    tenantId: string,
    allocations: BookingAllocation[]
  ): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        // Delete old
        await tx.bookingAllocation.deleteMany({
          where: { bookingId, tenantId },
        });

        // Insert new with overlap check
        for (const alloc of allocations) {
          const overlapping = await tx.bookingAllocation.findFirst({
            where: {
              tenantId,
              resourceId: alloc.resourceId,
              startAt: { lt: alloc.endAt },
              endAt: { gt: alloc.startAt },
              booking: { status: { in: ["CONFIRMED", "HOLD"] } },
            },
          });
          if (overlapping) {
            throw new ConflictException(
              `Resource ${alloc.resourceId} is no longer available for new time.`
            );
          }
        }

        if (allocations.length > 0) {
          await tx.bookingAllocation.createMany({
            data: allocations.map((a) => ({
              id: a.id,
              tenantId: a.tenantId,
              bookingId: a.bookingId,
              resourceId: a.resourceId,
              role: a.role as BookingAllocationRole,
              startAt: a.startAt,
              endAt: a.endAt,
              createdAt: a.createdAt,
            })),
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );
  }
}
