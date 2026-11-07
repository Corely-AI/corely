import type { TransactionContext } from "@corely/kernel";
import { BookingStaffConstraintAdapter } from "./booking-staff-constraint.adapter";
import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { HoldRepositoryPort } from "../../application/ports/booking-repo.ports";
import { BookingHold, type BookingHoldStatus } from "../../domain/booking.entities";
import { Prisma } from "@prisma/client";

@Injectable()
export class PrismaHoldRepoAdapter implements HoldRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staff: BookingStaffConstraintAdapter
  ) {}

  private mapToDomain(row: any): BookingHold {
    return new BookingHold(
      row.id,
      row.tenantId,
      row.workspaceId,
      row.status as BookingHoldStatus,
      row.startAt,
      row.endAt,
      row.serviceOfferingId,
      row.resourceIds,
      row.expiresAt,
      row.bookedByPartyId,
      row.bookedByName,
      row.bookedByEmail,
      row.notes,
      row.confirmedBookingId,
      row.createdByUserId,
      row.createdAt
    );
  }

  async create(hold: BookingHold): Promise<BookingHold> {
    const created = await this.prisma.$transaction(
      async (tx) => {
        for (const resourceId of [...new Set(hold.resourceIds)].sort()) {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${hold.tenantId}:${resourceId}`}, 0))::text`;
          await this.staff.assertAvailable(
            hold.tenantId,
            hold.workspaceId,
            resourceId,
            hold.startAt,
            hold.endAt,
            tx as unknown as TransactionContext
          );
          const [booking, activeHold] = await Promise.all([
            tx.bookingAllocation.findFirst({
              where: {
                tenantId: hold.tenantId,
                resourceId,
                startAt: { lt: hold.endAt },
                endAt: { gt: hold.startAt },
                booking: { status: { in: ["CONFIRMED", "HOLD"] } },
              },
            }),
            tx.bookingHold.findFirst({
              where: {
                tenantId: hold.tenantId,
                resourceIds: { has: resourceId },
                status: "ACTIVE",
                expiresAt: { gt: new Date() },
                startAt: { lt: hold.endAt },
                endAt: { gt: hold.startAt },
              },
            }),
          ]);
          if (booking || activeHold) {
            throw new ConflictException("Booking:SlotUnavailable");
          }
        }
        return tx.bookingHold.create({
          data: {
            id: hold.id,
            tenantId: hold.tenantId,
            workspaceId: hold.workspaceId,
            status: hold.status as BookingHoldStatus,
            startAt: hold.startAt,
            endAt: hold.endAt,
            serviceOfferingId: hold.serviceOfferingId,
            resourceIds: hold.resourceIds,
            expiresAt: hold.expiresAt,
            bookedByPartyId: hold.bookedByPartyId,
            bookedByName: hold.bookedByName,
            bookedByEmail: hold.bookedByEmail,
            notes: hold.notes,
            confirmedBookingId: hold.confirmedBookingId,
            createdByUserId: hold.createdByUserId,
            createdAt: hold.createdAt,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    );
    return this.mapToDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<BookingHold | null> {
    const row = await this.prisma.bookingHold.findUnique({
      where: { id, tenantId },
    });
    return row ? this.mapToDomain(row) : null;
  }

  async update(hold: BookingHold): Promise<BookingHold> {
    const updated = await this.prisma.bookingHold.update({
      where: { id: hold.id, tenantId: hold.tenantId },
      data: {
        status: hold.status as BookingHoldStatus,
        confirmedBookingId: hold.confirmedBookingId,
      },
    });
    return this.mapToDomain(updated);
  }

  async hasActiveOverlap(
    tenantId: string,
    resourceId: string,
    startAt: Date,
    endAt: Date,
    now: Date
  ): Promise<boolean> {
    const overlap = await this.prisma.bookingHold.findFirst({
      where: {
        tenantId,
        status: "ACTIVE",
        expiresAt: { gt: now },
        resourceIds: { has: resourceId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    return Boolean(overlap);
  }

  async expireStaleHolds(tenantId: string): Promise<number> {
    const result = await this.prisma.bookingHold.updateMany({
      where: {
        tenantId,
        status: "ACTIVE",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }
}
