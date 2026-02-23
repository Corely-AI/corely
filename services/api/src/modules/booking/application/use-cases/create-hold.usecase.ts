import type { UseCaseContext } from "@corely/kernel";
import type {
  BookingRepositoryPort,
  HoldRepositoryPort,
  ResourceRepositoryPort,
} from "../ports/booking-repo.ports";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { BookingHold } from "../../domain/booking.entities";
import { ConflictException, BadRequestException } from "@nestjs/common";

export interface CreateHoldInput {
  startAt: Date;
  endAt: Date;
  serviceOfferingId?: string | null;
  resourceIds: string[];
  bookedByPartyId?: string | null;
  bookedByName?: string | null;
  bookedByEmail?: string | null;
  notes?: string | null;
  ttlSeconds?: number;
  idempotencyKey: string;
}

export class CreateHoldUseCase {
  constructor(
    private readonly holdRepo: HoldRepositoryPort,
    private readonly bookingRepo: BookingRepositoryPort,
    private readonly resourceRepo: ResourceRepositoryPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: CreateHoldInput, ctx: UseCaseContext): Promise<BookingHold> {
    const tenantId = ctx.tenantId!;
    const now = this.clock.now();

    if (input.startAt >= input.endAt) {
      throw new BadRequestException("startAt must be before endAt");
    }

    if (input.resourceIds.length === 0) {
      throw new BadRequestException("At least one resourceId is required");
    }

    // Verify resources exist and are active
    for (const resId of input.resourceIds) {
      const res = await this.resourceRepo.findById(resId, tenantId);
      if (!res || !res.isActive) {
        throw new BadRequestException(`Resource ${resId} not found or inactive`);
      }

      // Check for overlap using booking repository
      const hasConflict = await this.bookingRepo.hasConflict(
        tenantId,
        resId,
        input.startAt,
        input.endAt
      );
      if (hasConflict) {
        throw new ConflictException(`Resource ${resId} is not available for requested time`);
      }
    }

    const ttl = input.ttlSeconds ?? 600; // default 10 min
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const hold = new BookingHold(
      this.idGenerator.newId(),
      tenantId,
      ctx.workspaceId ?? null,
      "ACTIVE",
      input.startAt,
      input.endAt,
      input.serviceOfferingId ?? null,
      input.resourceIds,
      expiresAt,
      input.bookedByPartyId ?? null,
      input.bookedByName ?? null,
      input.bookedByEmail ?? null,
      input.notes ?? null,
      null, // confirmedBookingId
      ctx.userId ?? null,
      now
    );

    // Note: To be fully safe in high concurrency, the hasConflict check above
    // and the hold create must be in a transaction. We will lean on the repository
    // implementation to do a select-for-update if necessary, but holds are soft-locks
    // so we can be slightly eventually consistent, relying on the hard-confirm to
    // do the final rigorous check.

    return this.holdRepo.create(hold);
  }
}
