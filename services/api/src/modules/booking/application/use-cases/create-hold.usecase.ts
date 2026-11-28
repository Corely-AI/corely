import { createHash } from "node:crypto";
import type { TransactionContext, UnitOfWorkPort, UseCaseContext } from "@corely/kernel";
import type { BookingRepositoryPort, HoldRepositoryPort } from "../ports/booking-repo.ports";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { BookingHold, type BookingHoldSnapshot } from "../../domain/booking.entities";
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
  idempotencyKey?: string;
}

export class CreateHoldUseCase {
  private readonly legacyAction = "booking.hold.create";

  constructor(
    private readonly holdRepo: HoldRepositoryPort,
    private readonly bookingRepo: BookingRepositoryPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly unitOfWork: UnitOfWorkPort
  ) {}

  async execute(
    input: CreateHoldInput,
    ctx: UseCaseContext,
    authorizePublicWrite?: (tx: TransactionContext) => Promise<void>
  ): Promise<BookingHold> {
    const { tenantId } = ctx;
    if (!tenantId) {
      throw new BadRequestException("Select a tenant");
    }

    if (input.startAt >= input.endAt) {
      throw new BadRequestException("startAt must be before endAt");
    }

    if (input.resourceIds.length === 0) {
      throw new BadRequestException("At least one resourceId is required");
    }

    const workspaceId = ctx.workspaceId ?? null;
    const action = `booking.hold.create:${workspaceId ?? "tenant"}`;
    const key = input.idempotencyKey;
    const ttl = input.ttlSeconds ?? 600;
    const resourceIds = [...new Set(input.resourceIds)];
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify([
          input.startAt,
          input.endAt,
          [...resourceIds].sort(),
          input.serviceOfferingId ?? null,
          input.bookedByPartyId ?? null,
          input.bookedByName ?? null,
          input.bookedByEmail ?? null,
          input.notes ?? null,
          ttl,
        ])
      )
      .digest("hex");

    return this.unitOfWork.withinTransaction(async (tx) => {
      await authorizePublicWrite?.(tx);
      if (key) {
        await this.bookingRepo.lockMutation(tenantId, `${action}:${key}`, tx);
        const cached = await this.idempotency.get(action, tenantId, key, tx);
        if (cached) {
          const receipt = cached.body as { fingerprint: string; hold: BookingHoldSnapshot };
          if (receipt.fingerprint !== fingerprint) {
            throw new ConflictException("Booking:IdempotencyMismatch");
          }
          return BookingHold.fromSnapshot(receipt.hold);
        }

        const legacy = await this.idempotency.get(this.legacyAction, tenantId, key, tx);
        const previous = legacy?.body as BookingHoldSnapshot | undefined;
        if (previous?.tenantId === tenantId && previous.workspaceId === workspaceId) {
          return BookingHold.fromSnapshot(previous);
        }
      }

      const now = this.clock.now();
      const hold = new BookingHold(
        this.idGenerator.newId(),
        tenantId,
        workspaceId,
        "ACTIVE",
        input.startAt,
        input.endAt,
        input.serviceOfferingId ?? null,
        resourceIds,
        new Date(now.getTime() + ttl * 1000),
        input.bookedByPartyId ?? null,
        input.bookedByName ?? null,
        input.bookedByEmail ?? null,
        input.notes ?? null,
        null,
        ctx.userId ?? null,
        now
      );
      const created = await this.holdRepo.create(hold, tx);
      if (key) {
        await this.idempotency.store(
          action,
          tenantId,
          key,
          { body: { fingerprint, hold: created } },
          tx
        );
      }
      return created;
    });
  }
}
