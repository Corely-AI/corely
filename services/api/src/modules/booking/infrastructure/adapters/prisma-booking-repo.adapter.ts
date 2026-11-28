import type { TransactionContext } from "@corely/kernel";
import { BookingStaffConstraintAdapter } from "./booking-staff-constraint.adapter";
import { assertBookingServiceAvailable } from "./booking-service-availability";
import { Injectable, ConflictException } from "@nestjs/common";
import { getPrismaClient, PrismaService } from "@corely/data";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly staff: BookingStaffConstraintAdapter
  ) {}

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

  async create(
    booking: BookingEntity,
    allocations: BookingAllocation[],
    transaction?: TransactionContext
  ): Promise<BookingEntity> {
    const write = async (tx: Prisma.TransactionClient) => {
      for (const resourceId of [...new Set(allocations.map((a) => a.resourceId))].sort()) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${booking.tenantId}:${resourceId}`}, 0))::text`;
      }
      await assertBookingServiceAvailable(
        tx,
        booking.tenantId,
        booking.workspaceId,
        booking.serviceOfferingId
      );
      if (booking.holdId) {
        const hold = await tx.bookingHold.findFirst({
          where: {
            id: booking.holdId,
            tenantId: booking.tenantId,
            workspaceId: booking.workspaceId,
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
          },
        });
        if (
          !hold ||
          hold.startAt.getTime() !== booking.startAt.getTime() ||
          hold.endAt.getTime() !== booking.endAt.getTime() ||
          JSON.stringify([...new Set(hold.resourceIds)].sort()) !==
            JSON.stringify([...new Set(allocations.map((a) => a.resourceId))].sort())
        ) {
          throw new ConflictException("Booking:HoldUnavailable");
        }
      }
      // 1. Conflict check inside TX to guarantee no race double bookings
      for (const alloc of allocations) {
        await this.staff.assertAvailable(
          booking.tenantId,
          booking.workspaceId,
          alloc.resourceId,
          alloc.startAt,
          alloc.endAt,
          tx as unknown as TransactionContext
        );
        await this.assertFree(tx, alloc, undefined, booking.holdId);
      }

      // 2. Insert booking with nested allocations
      const created = await tx.booking.create({
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
      if (booking.holdId) {
        const result = await tx.bookingHold.updateMany({
          where: {
            id: booking.holdId,
            tenantId: booking.tenantId,
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
          },
          data: { status: "CONFIRMED", confirmedBookingId: booking.id },
        });
        if (result.count !== 1) {
          throw new ConflictException("Booking:HoldUnavailable");
        }
      }
      return created;
    };
    const created = transaction
      ? await write(getPrismaClient(this.prisma, transaction))
      : await this.prisma.$transaction(write, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        });
    return this.mapToDomain(created);
  }

  async findById(
    id: string,
    tenantId: string,
    tx?: TransactionContext
  ): Promise<BookingEntity | null> {
    const row = await getPrismaClient(this.prisma, tx).booking.findUnique({
      where: { id, tenantId },
      include: { allocations: true },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async lockMutation(tenantId: string, key: string, tx: TransactionContext) {
    await getPrismaClient(this.prisma, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:booking-mutation:${key}`}, 0))::text`;
  }

  async mutationReceipt(
    tenantId: string,
    actionKey: string,
    key: string,
    fingerprint: string,
    tx: TransactionContext
  ) {
    const record = await getPrismaClient(this.prisma, tx).idempotencyKey.findUnique({
      where: { tenantId_actionKey_key: { tenantId, actionKey, key } },
    });
    if (!record) {
      return null;
    }
    if (record.requestHash !== fingerprint || !record.responseJson) {
      throw new ConflictException("Booking:IdempotencyMismatch");
    }
    const dateFields = new Set(["startAt", "endAt", "updatedAt", "createdAt", "cancelledAt"]);
    return this.mapToDomain(
      JSON.parse(record.responseJson, (field, value: unknown) =>
        dateFields.has(field) && typeof value === "string" ? new Date(value) : value
      )
    );
  }

  async saveMutationReceipt(
    booking: BookingEntity,
    actionKey: string,
    key: string,
    fingerprint: string,
    tx: TransactionContext
  ) {
    await getPrismaClient(this.prisma, tx).idempotencyKey.create({
      data: {
        tenantId: booking.tenantId,
        actionKey,
        key,
        requestHash: fingerprint,
        status: "COMPLETED",
        responseJson: JSON.stringify(booking),
      },
    });
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

  async update(booking: BookingEntity, tx: TransactionContext): Promise<BookingEntity> {
    const updated = await getPrismaClient(this.prisma, tx).booking.update({
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
    allocations: BookingAllocation[],
    tx: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);
    for (const resourceId of [...new Set(allocations.map((a) => a.resourceId))].sort()) {
      await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${resourceId}`}, 0))::text`;
    }
    const booking = await client.booking.findFirstOrThrow({
      where: { id: bookingId, tenantId },
      select: { workspaceId: true },
    });
    for (const alloc of allocations) {
      await this.staff.assertAvailable(
        tenantId,
        booking.workspaceId,
        alloc.resourceId,
        alloc.startAt,
        alloc.endAt,
        tx
      );
    }

    for (const alloc of allocations) {
      await this.assertFree(client, alloc, bookingId);
    }
    await client.bookingAllocation.deleteMany({ where: { bookingId, tenantId } });

    if (allocations.length > 0) {
      await client.bookingAllocation.createMany({
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
  }

  private async assertFree(
    client: Prisma.TransactionClient,
    allocation: BookingAllocation,
    excludeBookingId?: string,
    excludeHoldId?: string | null
  ) {
    const { tenantId, resourceId, startAt, endAt } = allocation;
    const interval = { startAt: { lt: endAt }, endAt: { gt: startAt } };
    const [booking, hold] = await Promise.all([
      client.bookingAllocation.findFirst({
        where: {
          tenantId,
          resourceId,
          ...interval,
          ...(excludeBookingId ? { bookingId: { not: excludeBookingId } } : {}),
          booking: { status: { in: ["CONFIRMED", "HOLD"] } },
        },
        select: { id: true },
      }),
      client.bookingHold.findFirst({
        where: {
          tenantId,
          ...interval,
          resourceIds: { has: resourceId },
          ...(excludeHoldId ? { id: { not: excludeHoldId } } : {}),
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      }),
    ]);
    if (booking || hold) {
      throw new ConflictException("Booking:SlotUnavailable");
    }
  }
}
