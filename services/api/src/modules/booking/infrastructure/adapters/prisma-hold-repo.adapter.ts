import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { HoldRepositoryPort } from "../../application/ports/booking-repo.ports";
import { BookingHold, type BookingHoldStatus } from "../../domain/booking.entities";
import { Prisma } from "@prisma/client";

@Injectable()
export class PrismaHoldRepoAdapter implements HoldRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

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
    const created = await this.prisma.bookingHold.create({
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
