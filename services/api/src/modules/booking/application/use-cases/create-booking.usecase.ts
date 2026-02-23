import type { UseCaseContext } from "@corely/kernel";
import { BookingAllocation, BookingEntity, type BookingHold } from "../../domain/booking.entities";
import type {
  BookingRepositoryPort,
  HoldRepositoryPort,
  ServiceRepositoryPort,
  ResourceRepositoryPort,
} from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import { randomBytes } from "crypto";

export interface CreateBookingInput {
  holdId?: string | null;
  startAt?: Date;
  endAt?: Date;
  resourceIds?: string[];
  serviceOfferingId?: string | null;
  bookedByPartyId?: string | null;
  bookedByName?: string | null;
  bookedByEmail?: string | null;
  notes?: string | null;
  idempotencyKey?: string;
}

export class CreateBookingUseCase {
  private readonly actionKey = "booking.booking.create";

  constructor(
    private readonly bookingRepo: BookingRepositoryPort,
    private readonly holdRepo: HoldRepositoryPort,
    private readonly resourceRepo: ResourceRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: CreateBookingInput, ctx: UseCaseContext): Promise<BookingEntity> {
    const tenantId = ctx.tenantId!;
    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached) {
        return cached.body as BookingEntity;
      }
    }

    const now = this.clock.now();
    let startAt: Date;
    let endAt: Date;
    let resourceIds: string[] = [];
    let serviceOfferingId: string | null = null;
    let hold: BookingHold | null = null;

    // Resolve hold if provided
    if (input.holdId) {
      hold = await this.holdRepo.findById(input.holdId, tenantId);
      if (!hold) {
        throw new NotFoundException(`Hold ${input.holdId} not found`);
      }
      if (hold.effectiveStatus !== "ACTIVE") {
        throw new ConflictException(`Hold ${input.holdId} is no longer active`);
      }

      startAt = hold.startAt;
      endAt = hold.endAt;
      resourceIds = hold.resourceIds;
      serviceOfferingId = hold.serviceOfferingId;
    } else {
      // Direct booking
      if (!input.startAt || !input.endAt || !input.resourceIds || input.resourceIds.length === 0) {
        throw new BadRequestException(
          "startAt, endAt, and resourceIds are required for direct booking"
        );
      }
      startAt = input.startAt;
      endAt = input.endAt;
      resourceIds = input.resourceIds;
      serviceOfferingId = input.serviceOfferingId ?? null;

      if (startAt >= endAt) {
        throw new BadRequestException("startAt must be before endAt");
      }
    }

    const bookingId = this.idGenerator.newId();
    const referenceNumber = "B-" + randomBytes(4).toString("hex").toUpperCase();

    const booking = new BookingEntity(
      bookingId,
      tenantId,
      ctx.workspaceId ?? null,
      "CONFIRMED", // Start confirmed immediately because we are creating the allocations now
      startAt,
      endAt,
      referenceNumber,
      serviceOfferingId,
      input.bookedByPartyId ?? hold?.bookedByPartyId ?? null,
      input.bookedByName ?? hold?.bookedByName ?? null,
      input.bookedByEmail ?? hold?.bookedByEmail ?? null,
      input.notes ?? hold?.notes ?? null,
      input.holdId ?? null,
      null,
      null,
      ctx.userId ?? null,
      now,
      now,
      []
    );

    const allocations = resourceIds.map(
      (resId) =>
        new BookingAllocation(
          this.idGenerator.newId(),
          tenantId,
          bookingId,
          resId,
          "PRIMARY",
          startAt,
          endAt,
          now
        )
    );

    // Provide the booking and its allocations to the repo.
    // The repo MUST use a transaction and check for overlaps!
    try {
      if (hold) {
        hold.confirm(bookingId);
        await this.holdRepo.update(hold); // Note: We should Ideally do this in a tx with bookingRepo.create
      }
      await this.bookingRepo.create(booking, allocations);
    } catch (err: any) {
      // Re-throw known conflicts
      if (err.message?.includes("Conflict")) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.created",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { startAt, endAt, resourceIds },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "booking.created",
      payload: { bookingId: booking.id, status: booking.status },
    });

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: booking,
      });
    }

    return booking;
  }
}
