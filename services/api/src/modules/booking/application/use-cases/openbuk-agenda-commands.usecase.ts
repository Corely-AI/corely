import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import type { OpenBukManagerCancel, OpenBukReplacement } from "@corely/contracts";
import { UNIT_OF_WORK, type UnitOfWorkPort, type UseCaseContext } from "@corely/kernel";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "../../../../shared/ports/idempotency-storage.port";
import { BOOKING_REPOSITORY, type BookingRepositoryPort } from "../ports/booking-repo.ports";
import { CancelBookingUseCase } from "./cancel-booking.usecase";
import { OpenBukAppointmentChangeUseCase } from "./openbuk-appointment-change.usecase";

type MoveResult = Awaited<ReturnType<OpenBukAppointmentChangeUseCase["applyReviewed"]>>;

@Injectable()
export class OpenBukAgendaCommandsUseCase {
  constructor(
    private readonly authorize: AuthorizeWorkspaceUseCase,
    private readonly changes: OpenBukAppointmentChangeUseCase,
    private readonly cancelBooking: CancelBookingUseCase,
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepositoryPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN) private readonly receipts: IdempotencyStoragePort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort
  ) {}

  private manager(ctx: UseCaseContext) {
    const { tenantId, workspaceId, userId } = ctx;
    if (!tenantId || !workspaceId || !userId) {
      throw new BadRequestException("An authenticated studio workspace is required");
    }
    return { tenantId, workspaceId, userId, manage: true };
  }

  async move(review: OpenBukReplacement, key: string, ctx: UseCaseContext): Promise<MoveResult> {
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const manager = this.manager(ctx);
    const { tenantId, workspaceId } = manager;
    const action = `openbuk.agenda.move:${workspaceId}`;
    const fingerprint = createHash("sha256").update(JSON.stringify(review)).digest("hex");
    return this.uow.withinTransaction(async (tx) => {
      await this.authorize.execute(manager, tx);
      await this.bookings.lockMutation(tenantId, `${action}:${key}`, tx);
      const cached = await this.receipts.get(action, tenantId, key, tx);
      if (cached) {
        const receipt = cached.body as { fingerprint: string; result: MoveResult };
        if (receipt.fingerprint !== fingerprint) {
          throw new ConflictException("Booking:IdempotencyMismatch");
        }
        return receipt.result;
      }
      const result = await this.changes.applyReviewed(review, `agenda:${key}`, ctx, tx);
      await this.receipts.store(action, tenantId, key, { body: { fingerprint, result } }, tx);
      return result;
    });
  }

  async cancel(input: OpenBukManagerCancel, ctx: UseCaseContext) {
    const manager = this.manager(ctx);
    return this.uow.withinTransaction(async (tx) => {
      await this.authorize.execute(manager, tx);
      const booking = await this.cancelBooking.executeInTransaction(
        { bookingId: input.bookingId, expectedVersion: input.version },
        ctx,
        tx
      );
      return { bookingId: booking.id, status: booking.status };
    });
  }
}
