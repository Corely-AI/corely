import {
  OpenBukReplacementInputSchema,
  OpenBukReplacementSchema,
  type OpenBukReplacement,
  type OpenBukReplacementInput,
} from "@corely/contracts";
import {
  CLOCK_PORT_TOKEN,
  type ClockPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import { BOOKING_POLICIES, enforceBookingPolicy } from "../booking-policy";
import type { BookingPolicyRegistration } from "@corely/booking/extensions";
import { BOOKING_REPOSITORY, type BookingRepositoryPort } from "../ports/booking-repo.ports";
import { OPENBUK_REPOSITORY, type OpenBukRepositoryPort } from "../ports/openbuk-repository.port";
import { OpenBukStudioUseCase } from "./openbuk-studio.usecase";
import { RescheduleBookingUseCase } from "./reschedule-booking.usecase";

@Injectable()
export class OpenBukAppointmentChangeUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepositoryPort,
    @Inject(OPENBUK_REPOSITORY) private readonly studioRepository: OpenBukRepositoryPort,
    private readonly studioApp: OpenBukStudioUseCase,
    @Inject(AuthorizeWorkspaceUseCase)
    private readonly authorize: Pick<AuthorizeWorkspaceUseCase, "execute">,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(BOOKING_POLICIES) private readonly policies: readonly BookingPolicyRegistration[],
    private readonly reschedule: RescheduleBookingUseCase
  ) {}

  async preview(input: OpenBukReplacementInput, ctx: UseCaseContext) {
    return this.check(OpenBukReplacementInputSchema.parse(input), ctx);
  }

  /** Called by the owning review workflow inside its apply transaction. */
  async applyReviewed(
    approved: OpenBukReplacement,
    idempotencyKey: string,
    ctx: UseCaseContext,
    tx: TransactionContext
  ) {
    const expected = OpenBukReplacementSchema.parse(approved);
    const actual = await this.check(
      { bookingId: expected.bookingId, startAt: expected.replacement.startAt },
      ctx,
      tx
    );
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new ConflictException("Booking:ReviewStale");
    }
    const changed = await this.reschedule.executeInTransaction(
      {
        bookingId: actual.bookingId,
        startAt: new Date(actual.replacement.startAt),
        endAt: new Date(actual.replacement.endAt),
        idempotencyKey,
      },
      ctx,
      tx
    );
    return {
      bookingId: changed.id,
      version: changed.updatedAt.toISOString(),
      appointment: actual.replacement,
    };
  }

  private async check(
    input: OpenBukReplacementInput,
    ctx: UseCaseContext,
    tx?: TransactionContext
  ): Promise<OpenBukReplacement> {
    const { tenantId, workspaceId, userId } = ctx;
    if (!tenantId || !workspaceId || !userId) {
      throw new BadRequestException("An authenticated studio workspace is required");
    }
    const scope = { tenantId, workspaceId };
    await this.authorize.execute({ ...scope, userId, manage: true }, tx);
    if (tx) {
      await this.studioRepository.lock(scope, `openbuk:${workspaceId}`, tx);
      await this.bookings.lockMutation(tenantId, input.bookingId, tx);
      await this.authorize.execute({ ...scope, userId, manage: true }, tx);
    }
    const booking = await this.bookings.findById(input.bookingId, tenantId, tx);
    if (!booking || booking.workspaceId !== workspaceId) {
      throw new NotFoundException("Booking not found");
    }
    const studio = await this.studioRepository.studio(scope, tx);
    const allocation = booking.allocations[0];
    const now = this.clock.now();
    if (
      !studio ||
      booking.serviceOfferingId !== studio.serviceId ||
      booking.status !== "CONFIRMED" ||
      booking.startAt <= now ||
      booking.allocations.length !== 1 ||
      !allocation ||
      allocation.resourceId !== studio.staffId
    ) {
      throw new ConflictException("Booking:ReplacementUnsupported");
    }
    // Existing appointments with changed studio rules require the full booking
    // management path. A replacement here retains the service and its buffers.
    const duration = booking.endAt.getTime() - booking.startAt.getTime();
    const bufferBefore = booking.startAt.getTime() - allocation.startAt.getTime();
    const bufferAfter = allocation.endAt.getTime() - booking.endAt.getTime();
    if (
      duration !== studio.durationMinutes * 60_000 ||
      bufferBefore !== studio.bufferBeforeMinutes * 60_000 ||
      bufferAfter !== studio.bufferAfterMinutes * 60_000
    ) {
      throw new ConflictException("Booking:ReplacementUnsupported");
    }
    const start = new Date(input.startAt);
    if (start.getTime() === booking.startAt.getTime()) {
      throw new BadRequestException("Select a different appointment time");
    }
    if (tx) {
      await this.studioRepository.lock(scope, studio.staffId, tx);
    }
    const slot = await this.studioApp.replacementSlot(
      scope,
      studio.timezone,
      booking.id,
      start,
      tx
    );
    enforceBookingPolicy(this.policies, scope, start, new Date(slot.endAt), now);
    const resource = { resourceId: studio.staffId, resourceName: studio.staffName };
    return OpenBukReplacementSchema.parse({
      bookingId: booking.id,
      reference: booking.referenceNumber ?? booking.id,
      version: booking.updatedAt.toISOString(),
      timezone: studio.timezone,
      current: {
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        ...resource,
      },
      replacement: { ...slot, ...resource },
    });
  }
}
