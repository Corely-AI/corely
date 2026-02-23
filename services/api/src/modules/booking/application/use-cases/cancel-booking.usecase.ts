import type { UseCaseContext } from "@corely/kernel";
import type { BookingRepositoryPort } from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import { NotFoundException, ConflictException } from "@nestjs/common";

export interface CancelBookingInput {
  bookingId: string;
  reason?: string | null;
  idempotencyKey?: string;
}

export class CancelBookingUseCase {
  constructor(
    private readonly bookingRepo: BookingRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort
  ) {}

  async execute(input: CancelBookingInput, ctx: UseCaseContext) {
    const tenantId = ctx.tenantId!;
    const booking = await this.bookingRepo.findById(input.bookingId, tenantId);
    if (!booking) {
      throw new NotFoundException(`Booking ${input.bookingId} not found`);
    }

    if (booking.status === "CANCELLED") {
      return booking; // idempotent
    }

    try {
      booking.cancel(input.reason);
      await this.bookingRepo.update(booking);
    } catch (e: any) {
      throw new ConflictException(e.message);
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.cancelled",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { reason: input.reason },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "booking.cancelled",
      payload: { bookingId: booking.id, reason: input.reason },
    });

    return booking;
  }
}
