import type { UnitOfWorkPort, UseCaseContext } from "@corely/kernel";
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
    private readonly outbox: OutboxPort,
    private readonly uow: UnitOfWorkPort
  ) {}

  async execute(input: CancelBookingInput, ctx: UseCaseContext) {
    const { tenantId } = ctx;
    if (!tenantId) {
      throw new NotFoundException("Booking not found");
    }
    return this.uow.withinTransaction(async (tx) => {
      await this.bookingRepo.lockMutation(tenantId, input.bookingId, tx);
      const booking = await this.bookingRepo.findById(input.bookingId, tenantId, tx);
      if (!booking || booking.workspaceId !== (ctx.workspaceId ?? null)) {
        throw new NotFoundException("Booking not found");
      }
      if (booking.status === "CANCELLED") {
        return booking;
      }
      const version = booking.updatedAt;
      try {
        booking.cancel(input.reason);
      } catch (error: unknown) {
        throw new ConflictException(
          error instanceof Error ? error.message : "Cannot cancel booking"
        );
      }
      booking.updatedAt = new Date(Math.max(booking.updatedAt.getTime(), version.getTime() + 1));
      const updated = await this.bookingRepo.update(booking, tx);
      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "booking.cancelled",
          entityType: "Booking",
          entityId: booking.id,
          metadata: { workspaceId: booking.workspaceId, reason: input.reason },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "booking.cancelled",
          payload: {
            bookingId: booking.id,
            workspaceId: booking.workspaceId,
            reason: input.reason,
          },
        },
        tx
      );
      return updated;
    });
  }
}
