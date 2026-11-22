import { createHash } from "node:crypto";
import type {
  TransactionContext,
  UnitOfWorkPort,
  UseCaseContext,
  OutboxPort,
} from "@corely/kernel";
import { BookingAllocation } from "../../domain/booking.entities";
import type { BookingRepositoryPort } from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { BookingPolicyRegistration } from "@corely/booking/extensions";
import { enforceBookingPolicy } from "../booking-policy";

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
    private readonly clock: ClockPort,
    private readonly uow: UnitOfWorkPort,
    private readonly policies: readonly BookingPolicyRegistration[]
  ) {}

  async execute(input: RescheduleBookingInput, ctx: UseCaseContext) {
    return this.uow.withinTransaction((tx) => this.executeInTransaction(input, ctx, tx));
  }

  async executeInTransaction(
    input: RescheduleBookingInput,
    ctx: UseCaseContext,
    tx: TransactionContext
  ) {
    const { tenantId } = ctx;
    const { bookingId, startAt, endAt, idempotencyKey } = input;
    if (!tenantId || !(startAt < endAt)) {
      throw new BadRequestException("Select a tenant and provide a valid time range");
    }

    await this.bookingRepo.lockMutation(tenantId, bookingId, tx);
    const booking = await this.bookingRepo.findById(bookingId, tenantId, tx);
    if (!booking || booking.workspaceId !== (ctx.workspaceId ?? null)) {
      throw new NotFoundException("Booking not found");
    }

    const action = `booking.reschedule:${bookingId}`;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([startAt, endAt, input.notes ?? null]))
      .digest("hex");
    if (idempotencyKey) {
      const receipt = await this.bookingRepo.mutationReceipt(
        tenantId,
        action,
        idempotencyKey,
        fingerprint,
        tx
      );
      if (receipt) {
        return receipt;
      }
    }

    const now = this.clock.now();
    enforceBookingPolicy(
      this.policies,
      { tenantId, workspaceId: ctx.workspaceId },
      startAt,
      endAt,
      now
    );
    const allocations = booking.allocations.map((allocation) => {
      const before = booking.startAt.getTime() - allocation.startAt.getTime();
      const after = allocation.endAt.getTime() - booking.endAt.getTime();
      return new BookingAllocation(
        this.idGenerator.newId(),
        tenantId,
        bookingId,
        allocation.resourceId,
        allocation.role,
        new Date(startAt.getTime() - before),
        new Date(endAt.getTime() + after),
        now
      );
    });

    if (booking.status !== "DRAFT" && booking.status !== "CONFIRMED") {
      throw new ConflictException("Booking cannot be moved in its current state");
    }
    const version = booking.updatedAt;
    booking.reschedule(startAt, endAt);
    booking.updatedAt = new Date(Math.max(now.getTime(), version.getTime() + 1));
    if (input.notes) {
      booking.notes = input.notes;
    }

    await this.bookingRepo.replaceAllocations(bookingId, tenantId, allocations, tx);
    const updated = await this.bookingRepo.update(booking, tx);
    await this.audit.log(
      {
        tenantId,
        userId: ctx.userId ?? "system",
        action: "booking.rescheduled",
        entityType: "Booking",
        entityId: bookingId,
        metadata: { workspaceId: booking.workspaceId, startAt, endAt },
      },
      tx
    );
    await this.outbox.enqueue(
      {
        tenantId,
        eventType: "booking.rescheduled",
        payload: { bookingId, workspaceId: booking.workspaceId, startAt, endAt },
      },
      tx
    );

    if (idempotencyKey) {
      await this.bookingRepo.saveMutationReceipt(updated, action, idempotencyKey, fingerprint, tx);
    }
    return updated;
  }
}
