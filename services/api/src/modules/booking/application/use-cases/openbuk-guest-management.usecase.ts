import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CLOCK_PORT_TOKEN,
  UNIT_OF_WORK,
  type ClockPort,
  type TransactionContext,
  type UnitOfWorkPort,
  type UseCaseContext,
} from "@corely/kernel";
import type { OpenBukManageDetails, OpenBukStudio } from "@corely/contracts";
import type { BookingPolicyRegistration } from "@corely/booking/extensions";
import { assertPublicModuleEnabled } from "../../../../shared/public";
import { PilotSetupUseCase } from "../../../workspaces/public";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "../../../../shared/ports/idempotency-storage.port";
import { BOOKING_REPOSITORY, type BookingRepositoryPort } from "../ports/booking-repo.ports";
import {
  OPENBUK_REPOSITORY,
  type OpenBukRepositoryPort,
  type StudioScope,
} from "../ports/openbuk-repository.port";
import type { BookingEntity } from "../../domain/booking.entities";
import { BOOKING_POLICIES, enforceBookingPolicy } from "../booking-policy";
import { CancelBookingUseCase } from "./cancel-booking.usecase";
import { OpenBukGuestCredentials } from "./openbuk-guest-credentials";
import { OpenBukStudioUseCase } from "./openbuk-studio.usecase";
import { RescheduleBookingUseCase } from "./reschedule-booking.usecase";

type Command =
  | { kind: "cancel"; version: string }
  | { kind: "move"; version: string; startAt: string };
type Result = { status: "cancelled" } | { status: "moved"; appointment: OpenBukManageDetails };

@Injectable()
export class OpenBukGuestManagementUseCase {
  constructor(
    @Inject(OPENBUK_REPOSITORY) private readonly studio: OpenBukRepositoryPort,
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepositoryPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(BOOKING_POLICIES) private readonly policies: readonly BookingPolicyRegistration[],
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN) private readonly receipts: IdempotencyStoragePort,
    private readonly credentials: OpenBukGuestCredentials,
    private readonly studioApp: OpenBukStudioUseCase,
    private readonly publication: PilotSetupUseCase,
    private readonly cancellation: CancelBookingUseCase,
    private readonly reschedule: RescheduleBookingUseCase
  ) {}

  private unavailable() {
    return new NotFoundException("Booking management is unavailable");
  }

  private scope(ctx: UseCaseContext): StudioScope {
    if (assertPublicModuleEnabled(ctx, "booking") || !ctx.tenantId || !ctx.workspaceId) {
      throw this.unavailable();
    }
    return { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
  }

  private selection(booking: BookingEntity) {
    const [allocation] = booking.allocations;
    return booking.serviceOfferingId && booking.allocations.length === 1 && allocation
      ? { serviceId: booking.serviceOfferingId, staffId: allocation.resourceId }
      : null;
  }

  private compatible(studio: OpenBukStudio | null, booking: BookingEntity) {
    const [allocation] = booking.allocations;
    return Boolean(
      studio &&
      allocation &&
      booking.endAt.getTime() - booking.startAt.getTime() === studio.durationMinutes * 60_000 &&
      booking.startAt.getTime() - allocation.startAt.getTime() ===
        studio.bufferBeforeMinutes * 60_000 &&
      allocation.endAt.getTime() - booking.endAt.getTime() === studio.bufferAfterMinutes * 60_000
    );
  }

  private async activeBooking(
    scope: StudioScope,
    bookingId: string,
    now: Date,
    tx?: TransactionContext
  ) {
    const booking = await this.bookings.findById(bookingId, scope.tenantId, tx);
    if (
      !booking ||
      booking.workspaceId !== scope.workspaceId ||
      booking.status !== "CONFIRMED" ||
      booking.startAt <= now
    ) {
      throw this.unavailable();
    }
    return booking;
  }

  private async details(
    scope: StudioScope,
    booking: BookingEntity,
    tx?: TransactionContext
  ): Promise<OpenBukManageDetails> {
    const selection = this.selection(booking);
    const [snapshot, activePair] = await Promise.all([
      this.studio.snapshot(scope, booking.id, tx),
      selection ? this.studio.studio(scope, tx, selection) : Promise.resolve(null),
    ]);
    if (!snapshot) {
      throw this.unavailable();
    }
    return {
      reference: snapshot.reference,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      serviceName: snapshot.serviceName,
      staffName: snapshot.staffName,
      timezone: activePair?.timezone ?? snapshot.timezone,
      version: booking.updatedAt.toISOString(),
      canMove: this.compatible(activePair, booking),
    };
  }

  private async lookup(token: string, ctx: UseCaseContext) {
    const scope = this.scope(ctx);
    const now = this.clock.now();
    const result = await this.credentials.find(scope, token, now);
    if (!result || result.credential.revokedAt) {
      throw this.unavailable();
    }
    return { scope, booking: await this.activeBooking(scope, result.credential.bookingId, now) };
  }

  async read(token: string, ctx: UseCaseContext) {
    const { scope, booking } = await this.lookup(token, ctx);
    return this.details(scope, booking);
  }

  async availability(token: string, day: string, ctx: UseCaseContext) {
    const { scope, booking } = await this.lookup(token, ctx);
    const selection = this.selection(booking);
    if (!selection) {
      return { slots: [] };
    }
    try {
      const { slots, studio } = await this.studioApp.appointmentSlots(
        scope,
        day,
        selection,
        booking.id
      );
      if (!this.compatible(studio, booking)) {
        return { slots: [] };
      }
      return { slots: slots.filter(({ startAt }) => startAt !== booking.startAt.toISOString()) };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { slots: [] };
      }
      throw error;
    }
  }

  async execute(
    token: string,
    command: Command,
    key: string,
    ctx: UseCaseContext
  ): Promise<Result> {
    const scope = this.scope(ctx);
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const fingerprint = createHash("sha256").update(JSON.stringify(command)).digest("hex");
    return this.uow.withinTransaction(async (tx) => {
      await this.studio.lock(scope, `openbuk:${scope.workspaceId}`, tx);
      await this.publication.requirePublicBooking(scope.tenantId, scope.workspaceId, tx);
      const now = this.clock.now();
      const access = await this.credentials.find(scope, token, now, tx);
      if (!access) {
        throw this.unavailable();
      }
      const { credential, digest } = access;
      const action = `openbuk.guest.manage:${scope.workspaceId}:${digest}`;
      const cached = await this.receipts.get(action, scope.tenantId, key, tx);
      if (cached) {
        const record = cached.body as { fingerprint: string; result: Result };
        if (
          record.fingerprint === fingerprint &&
          (!credential.revokedAt || record.result.status === "cancelled")
        ) {
          return record.result;
        }
        if (credential.revokedAt) {
          throw this.unavailable();
        }
        throw new ConflictException("Booking:IdempotencyMismatch");
      }
      if (credential.revokedAt) {
        throw this.unavailable();
      }
      await this.bookings.lockMutation(scope.tenantId, credential.bookingId, tx);
      const booking = await this.activeBooking(scope, credential.bookingId, now, tx);
      if (booking.updatedAt.toISOString() !== command.version) {
        throw new ConflictException("Booking:ReviewStale");
      }
      const guestContext = { ...ctx, userId: "public" };
      let result: Result;
      if (command.kind === "cancel") {
        enforceBookingPolicy(this.policies, scope, booking.startAt, booking.endAt, now);
        await this.cancellation.executeInTransaction(
          { bookingId: booking.id, expectedVersion: command.version },
          guestContext,
          tx
        );
        await this.credentials.revoke(scope, digest, credential, now, tx);
        result = { status: "cancelled" };
      } else {
        result = await this.move(
          scope,
          booking,
          new Date(command.startAt),
          `guest:${digest}:${key}`,
          guestContext,
          tx
        );
      }
      await this.receipts.store(action, scope.tenantId, key, { body: { fingerprint, result } }, tx);
      return result;
    });
  }

  private async move(
    scope: StudioScope,
    booking: BookingEntity,
    start: Date,
    key: string,
    ctx: UseCaseContext,
    tx: TransactionContext
  ): Promise<Result> {
    const selection = this.selection(booking);
    if (!selection || start.getTime() === booking.startAt.getTime()) {
      throw new ConflictException("Booking:SlotUnavailable");
    }
    await this.studio.lock(scope, selection.staffId, tx);
    const studio = await this.studio.studio(scope, tx, selection);
    // Preserve the originally booked duration and buffers when the studio still offers that pair.
    if (!studio || !this.compatible(studio, booking)) {
      throw new ConflictException("Booking:SlotUnavailable");
    }
    const slot = await this.studioApp.replacementSlot(
      scope,
      studio.timezone,
      booking.id,
      start,
      tx,
      selection
    );
    const changed = await this.reschedule.executeInTransaction(
      { bookingId: booking.id, startAt: start, endAt: new Date(slot.endAt), idempotencyKey: key },
      ctx,
      tx
    );
    return { status: "moved", appointment: await this.details(scope, changed, tx) };
  }
}
