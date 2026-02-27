import type { UseCaseContext } from "@corely/kernel";
import { BookingAllocation } from "../../domain/booking.entities";
import type { BookingRepositoryPort } from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";

export interface RescheduleBookingInput {
  bookingId: string;
  startAt: Date;
  endAt: Date;
  notes?: string | null;
  idempotencyKey?: string;
}

export class RescheduleBookingUseCase {
  constructor(
    private readonly bookingRepo: BookingRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: RescheduleBookingInput, ctx: UseCaseContext) {
    const tenantId = ctx.tenantId!;
    const booking = await this.bookingRepo.findById(input.bookingId, tenantId);
    if (!booking) {
      throw new NotFoundException(`Booking ${input.bookingId} not found`);
    }

    if (input.startAt >= input.endAt) {
      throw new BadRequestException("startAt must be before endAt");
    }

    // Gather old resources to re-book them
    const resourceIds = Array.from(new Set(booking.allocations.map((a) => a.resourceId)));

    // Try to reschedule in domain
    try {
      booking.reschedule(input.startAt, input.endAt);
      if (input.notes) {
        booking.notes = input.notes;
      }
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    const now = this.clock.now();
    const newAllocations = resourceIds.map(
      (resId) =>
        new BookingAllocation(
          this.idGenerator.newId(),
          tenantId,
          booking.id,
          resId,
          "PRIMARY",
          input.startAt,
          input.endAt,
          now
        )
    );

    // Save: this replaceAllocations must do a conflict check ignoring the current booking's old allocations
    try {
      await this.bookingRepo.replaceAllocations(booking.id, tenantId, newAllocations);
      await this.bookingRepo.update(booking);
    } catch (e: any) {
      throw new ConflictException(e.message ?? "Could not reschedule due to resource conflict");
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.rescheduled",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { startAt: input.startAt, endAt: input.endAt },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "booking.rescheduled",
      payload: { bookingId: booking.id, startAt: input.startAt, endAt: input.endAt },
    });

    // Re-fetch to return full state with new allocations
    return this.bookingRepo.findById(input.bookingId, tenantId);
  }
}
