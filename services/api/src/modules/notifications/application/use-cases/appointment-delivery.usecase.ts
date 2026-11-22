import { createHash } from "node:crypto";
import {
  APPOINTMENT_DELIVERY_REQUESTED,
  AppointmentUpdateMessageSchema,
  type AppointmentDeliveryStatus,
  type AppointmentUpdateMessage,
} from "@corely/contracts";
import {
  CLOCK_PORT_TOKEN,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  type ClockPort,
  type EmailSenderPort,
  type OutboxPort,
  type TransactionContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { OpenBukAppointmentChangeUseCase } from "../../../booking/public/appointment-changes";
import {
  APPOINTMENT_DELIVERY_STORE,
  type AppointmentDeliveryRecord,
  type AppointmentDeliveryScope,
  type AppointmentDeliveryStore,
} from "../ports/appointment-delivery.port";

const retryWindow = 3_600_000;
const leaseTime = 60_000;
const maxAttempts = 5;

@Injectable()
export class AppointmentDeliveryUseCase {
  constructor(
    @Inject(APPOINTMENT_DELIVERY_STORE) private readonly store: AppointmentDeliveryStore,
    @Inject(OpenBukAppointmentChangeUseCase)
    private readonly booking: Pick<OpenBukAppointmentChangeUseCase, "customerMessageContext">,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  /** Accepts the exact human-reviewed message from the review transaction. */
  async enqueue(
    scope: AppointmentDeliveryScope,
    input: AppointmentUpdateMessage,
    tx: TransactionContext,
    expiresAt?: string
  ) {
    const message = AppointmentUpdateMessageSchema.parse(input);
    const id = createHash("sha256")
      .update(
        JSON.stringify([
          scope.tenantId,
          scope.workspaceId,
          message.bookingId,
          message.bookingVersion,
        ])
      )
      .digest("hex");
    const current = await this.currentBooking(scope, message, tx);
    await this.store.lock(scope, id, tx);
    const prior = await this.store.get(scope, id, tx);
    if (prior) {
      if (JSON.stringify(prior.message) !== JSON.stringify(message)) {
        throw new ConflictException("Notifications:AppointmentUpdateAlreadyQueued");
      }
      return this.status(scope, id, prior);
    }
    if (!current) {
      throw new ConflictException("Notifications:AppointmentUpdateStale");
    }
    const now = this.clock.now();
    if (expiresAt && Date.parse(expiresAt) <= now.getTime()) {
      throw new ConflictException("Notifications:ReviewExpired");
    }
    const record: AppointmentDeliveryRecord = {
      message,
      state: "pending",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deadline: new Date(
        Math.min(now.getTime() + retryWindow, Date.parse(current.startAt))
      ).toISOString(),
      attempts: 0,
      leaseUntil: null,
      providerMessageId: null,
    };
    await this.store.save(scope, id, record, tx);
    await this.schedule(scope, id, tx);
    return this.status(scope, id, record);
  }

  async getStatus(scope: AppointmentDeliveryScope, id: string, tx?: TransactionContext) {
    const record = await this.store.get(scope, id, tx);
    if (!record) {
      throw new NotFoundException("Delivery not found");
    }
    return this.status(scope, id, record);
  }

  async retry(scope: AppointmentDeliveryScope, id: string, tx: TransactionContext) {
    await this.store.lock(scope, id, tx);
    const record = await this.store.get(scope, id, tx);
    if (!record) {
      throw new NotFoundException("Delivery not found");
    }
    if (record.state !== "failed") {
      return this.status(scope, id, record);
    }
    if (!this.canRetry(record)) {
      throw new ConflictException("Notifications:DeliveryRetryExpired");
    }
    const pending: AppointmentDeliveryRecord = {
      ...record,
      state: "pending",
      updatedAt: this.clock.now().toISOString(),
    };
    await this.store.save(scope, id, pending, tx);
    await this.schedule(scope, id, tx);
    return this.status(scope, id, pending);
  }

  async dispatch(scope: AppointmentDeliveryScope, id: string, email: EmailSenderPort) {
    const claim = await this.uow.withinTransaction((tx) => this.claim(scope, id, tx));
    if (!claim) {
      return;
    }
    const { message } = claim;
    let providerId: string;
    try {
      const result = await email.sendEmail({
        tenantId: scope.tenantId,
        to: [message.recipient],
        subject: message.subject,
        text: message.body,
        idempotencyKey: `appointment-update/${id}`,
      });
      providerId = result.providerMessageId;
    } catch {
      const failed = await this.finish(scope, id, claim.attempts, null);
      if (failed && this.canRetry(failed)) {
        throw new Error("Appointment update sender unavailable");
      }
      return;
    }
    await this.finish(scope, id, claim.attempts, providerId);
  }

  private async claim(scope: AppointmentDeliveryScope, id: string, tx: TransactionContext) {
    const initial = await this.store.get(scope, id, tx);
    if (!initial || initial.state === "accepted" || initial.state === "superseded") {
      return null;
    }
    // Message content is immutable after enqueue. Keep the same booking-then-delivery lock order.
    const current = await this.currentBooking(scope, initial.message, tx);
    await this.store.lock(scope, id, tx);
    const record = await this.store.get(scope, id, tx);
    if (!record || record.state === "accepted" || record.state === "superseded") {
      return null;
    }
    const now = this.clock.now();
    if (record.leaseUntil && Date.parse(record.leaseUntil) > now.getTime()) {
      throw new Error("Appointment update is in progress");
    }
    if (!current || !this.canRetry(record)) {
      await this.store.save(
        scope,
        id,
        {
          ...record,
          state: current ? "failed" : "superseded",
          updatedAt: now.toISOString(),
          leaseUntil: null,
        },
        tx
      );
      return null;
    }
    const claimed: AppointmentDeliveryRecord = {
      ...record,
      state: "pending",
      attempts: record.attempts + 1,
      updatedAt: now.toISOString(),
      leaseUntil: new Date(now.getTime() + leaseTime).toISOString(),
    };
    await this.store.save(scope, id, claimed, tx);
    return claimed;
  }

  private async finish(
    scope: AppointmentDeliveryScope,
    id: string,
    attempt: number,
    providerId: string | null
  ) {
    return this.uow.withinTransaction(async (tx) => {
      await this.store.lock(scope, id, tx);
      const record = await this.store.get(scope, id, tx);
      if (!record || record.attempts !== attempt || !record.leaseUntil) {
        return null;
      }
      const finished: AppointmentDeliveryRecord = {
        ...record,
        state: providerId ? "accepted" : "failed",
        providerMessageId: providerId,
        leaseUntil: null,
        updatedAt: this.clock.now().toISOString(),
      };
      await this.store.save(scope, id, finished, tx);
      return finished;
    });
  }

  private async currentBooking(
    scope: AppointmentDeliveryScope,
    message: AppointmentUpdateMessage,
    tx: TransactionContext
  ) {
    const current = await this.booking.customerMessageContext(scope, message.bookingId, tx);
    return current?.bookingVersion === message.bookingVersion &&
      current.recipient === message.recipient
      ? current
      : null;
  }

  private schedule(scope: AppointmentDeliveryScope, id: string, tx: TransactionContext) {
    return this.outbox.enqueue(
      {
        tenantId: scope.tenantId,
        eventType: APPOINTMENT_DELIVERY_REQUESTED,
        payload: { workspaceId: scope.workspaceId, deliveryId: id },
      },
      tx
    );
  }

  private canRetry(record: AppointmentDeliveryRecord) {
    return (
      record.attempts < maxAttempts && Date.parse(record.deadline) > this.clock.now().getTime()
    );
  }

  private status(
    scope: AppointmentDeliveryScope,
    id: string,
    record: AppointmentDeliveryRecord
  ): AppointmentDeliveryStatus {
    const expired =
      !this.canRetry(record) &&
      record.state === "pending" &&
      (!record.leaseUntil || Date.parse(record.leaseUntil) <= this.clock.now().getTime());
    return {
      deliveryId: id,
      workspaceId: scope.workspaceId,
      bookingId: record.message.bookingId,
      state: expired ? "failed" : record.state,
      attempts: record.attempts,
      updatedAt: record.updatedAt,
      retryable: record.state === "failed" && this.canRetry(record),
    };
  }
}
