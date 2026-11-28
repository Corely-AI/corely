import type { TransactionContext, UnitOfWorkPort, UseCaseContext } from "@corely/kernel";
import { BookingAllocation, BookingEntity, type BookingHold } from "../../domain/booking.entities";
import type {
  BookingRepositoryPort,
  HoldRepositoryPort,
  ServiceRepositoryPort,
} from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import type { BookingPolicyRegistration } from "@corely/booking/extensions";
import { enforceBookingPolicy } from "../booking-policy";

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
  private readonly legacyAction = "booking.booking.create";

  constructor(
    private readonly bookingRepo: BookingRepositoryPort,
    private readonly holdRepo: HoldRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly uow: UnitOfWorkPort,
    private readonly policies: readonly BookingPolicyRegistration[] = []
  ) {}

  async execute(
    input: CreateBookingInput,
    ctx: UseCaseContext,
    authorizePublicWrite?: (tx: TransactionContext) => Promise<void>
  ): Promise<BookingEntity> {
    const { tenantId } = ctx;
    if (!tenantId) {
      throw new BadRequestException("Select a tenant");
    }
    const action = `booking.create:${ctx.workspaceId ?? "tenant"}`;
    const key = input.idempotencyKey;
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify([
          input.holdId ?? null,
          input.startAt ?? null,
          input.endAt ?? null,
          [...new Set(input.resourceIds ?? [])].sort(),
          input.serviceOfferingId ?? null,
          input.bookedByPartyId ?? null,
          input.bookedByName ?? null,
          input.bookedByEmail ?? null,
          input.notes ?? null,
        ])
      )
      .digest("hex");

    return this.uow.withinTransaction(async (tx) => {
      await authorizePublicWrite?.(tx);
      if (key) {
        await this.bookingRepo.lockMutation(tenantId, `${action}:${key}`, tx);
        const receipt = await this.bookingRepo.mutationReceipt(
          tenantId,
          action,
          key,
          fingerprint,
          tx
        );
        if (receipt) {
          return receipt;
        }
        const legacy = await this.idempotency.get(this.legacyAction, tenantId, key, tx);
        const previous = legacy?.body as BookingEntity | undefined;
        if (previous?.tenantId === tenantId && previous.workspaceId === (ctx.workspaceId ?? null)) {
          return previous;
        }
      }
      const booking = await this.create(input, ctx, tenantId, tx);
      if (key) {
        await this.bookingRepo.saveMutationReceipt(booking, action, key, fingerprint, tx);
      }
      return booking;
    });
  }

  private async create(
    input: CreateBookingInput,
    ctx: UseCaseContext,
    tenantId: string,
    tx: TransactionContext
  ) {
    const now = this.clock.now();
    let startAt: Date;
    let endAt: Date;
    let resourceIds: string[] = [];
    let serviceOfferingId: string | null = null;
    let hold: BookingHold | null = null;

    // Resolve hold if provided
    if (input.holdId) {
      hold = await this.holdRepo.findById(input.holdId, tenantId);
      if (!hold || hold.workspaceId !== (ctx.workspaceId ?? null)) {
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
      resourceIds = [...new Set(input.resourceIds)];
      serviceOfferingId = input.serviceOfferingId ?? null;

      if (!(startAt < endAt)) {
        throw new BadRequestException("startAt must be before endAt");
      }
    }

    enforceBookingPolicy(
      this.policies,
      { tenantId, workspaceId: ctx.workspaceId },
      startAt,
      endAt,
      now
    );

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

    const created = await this.bookingRepo.create(booking, allocations, tx);

    await this.audit.log(
      {
        tenantId,
        userId: ctx.userId ?? "system",
        action: "booking.created",
        entityType: "Booking",
        entityId: booking.id,
        metadata: { workspaceId: booking.workspaceId, startAt, endAt, resourceIds },
      },
      tx
    );

    await this.outbox.enqueue(
      {
        tenantId,
        eventType: "booking.created",
        payload: {
          bookingId: booking.id,
          workspaceId: booking.workspaceId,
          status: booking.status,
        },
      },
      tx
    );

    return created;
  }
}
