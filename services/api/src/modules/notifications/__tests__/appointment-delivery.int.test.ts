import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaService,
  PrismaUnitOfWork,
} from "@corely/data";
import type { EmailSenderPort, SendEmailRequest } from "@corely/kernel";
import { APPOINTMENT_DELIVERY_REQUESTED, type AppointmentUpdateMessage } from "@corely/contracts";
import { AppointmentDeliveryHandler } from "../../background/runtime/modules/booking/appointment-delivery.handler";
import { AppointmentDeliveryUseCase } from "../application/use-cases/appointment-delivery.usecase";
import { PrismaAppointmentDeliveryStore } from "../infrastructure/prisma-appointment-delivery.store";

const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Reviewed appointment email delivery", () => {
  const scope = { tenantId: randomUUID(), workspaceId: randomUUID() };
  const recipient = "guest@example.test";
  const subject = "Your appointment was moved";
  const body = "Your new appointment is at 10:00.";
  const bookingVersion = "2026-10-01T00:01:00.000Z";
  const current = new Map<string, string>();
  let now = new Date("2026-10-01T00:02:00.000Z");
  let prisma: PrismaService;
  let uow: PrismaUnitOfWork;
  let deliveries: AppointmentDeliveryUseCase;
  const accepted = new Map<string, SendEmailRequest>();
  let loseResponse = false;
  const sink: EmailSenderPort = {
    sendEmail: async (message) => {
      const key = message.idempotencyKey ?? "";
      if (!accepted.has(key)) {
        accepted.set(key, message);
        if (loseResponse) {
          throw new Error("provider accepted the email before the connection dropped");
        }
      }
      return { provider: "test", providerMessageId: "synthetic" };
    },
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    uow = new PrismaUnitOfWork(prisma);
    deliveries = new AppointmentDeliveryUseCase(
      new PrismaAppointmentDeliveryStore(prisma, new PrismaExtKvAdapter(prisma)),
      {
        confirmationMessageContext: async () => null,
        customerMessageContext: async (target, bookingId) => {
          const version = current.get(bookingId);
          if (
            !version ||
            target.tenantId !== scope.tenantId ||
            target.workspaceId !== scope.workspaceId
          ) {
            return null;
          }
          return {
            bookingVersion: version,
            recipient,
            reference: "TEST",
            startAt: "2026-10-05T09:00:00.000Z",
            endAt: "2026-10-05T10:00:00.000Z",
            timezone: "Europe/Berlin",
            locale: "en" as const,
          };
        },
      },
      uow,
      new PrismaOutboxAdapter(prisma),
      { now: () => now }
    );
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    await prisma.extKv.deleteMany({ where: { tenantId: scope.tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId: scope.tenantId } });
    await prisma.onModuleDestroy();
  });

  const create = () => {
    const bookingId = randomUUID();
    current.set(bookingId, bookingVersion);
    return { bookingId, bookingVersion, recipient, subject, body };
  };
  const dispatch = (deliveryId: string) =>
    new AppointmentDeliveryHandler(deliveries, sink).handle({
      id: randomUUID(),
      tenantId: scope.tenantId,
      eventType: APPOINTMENT_DELIVERY_REQUESTED,
      payload: { workspaceId: scope.workspaceId, deliveryId },
    });
  const enqueue = (message: AppointmentUpdateMessage) =>
    uow.withinTransaction((tx) => deliveries.enqueue(scope, message, tx));

  it("queues once, records failure after a lost response and recovers on the same delivery identifier", async () => {
    const message = create();
    const [first, duplicate] = await Promise.all([enqueue(message), enqueue(message)]);
    const id = first.deliveryId;
    expect(duplicate).toEqual(first);
    expect(first.state).toBe("pending");
    expect(accepted.size).toBe(0);
    const outbox = await prisma.outboxEvent.findMany({
      where: { tenantId: scope.tenantId, eventType: APPOINTMENT_DELIVERY_REQUESTED },
    });
    expect(outbox).toHaveLength(1);
    expect(JSON.parse(outbox[0]!.payloadJson)).toEqual({
      workspaceId: scope.workspaceId,
      deliveryId: id,
    });
    await expect(enqueue({ ...message, body: "changed after approval" })).rejects.toThrow(
      "Notifications:AppointmentUpdateAlreadyQueued"
    );
    await expect(deliveries.getStatus({ ...scope, workspaceId: randomUUID() }, id)).rejects.toThrow(
      "Delivery not found"
    );

    loseResponse = true;
    await expect(dispatch(id)).rejects.toThrow("Appointment update sender unavailable");
    expect(await deliveries.getStatus(scope, id)).toMatchObject({
      state: "failed",
      attempts: 1,
      retryable: true,
    });
    await uow.withinTransaction((tx) => deliveries.retry(scope, id, tx));
    await dispatch(id);
    await dispatch(id);
    loseResponse = false;

    expect(await deliveries.getStatus(scope, id)).toMatchObject({
      state: "accepted",
      attempts: 2,
      retryable: false,
    });
    expect(accepted.size).toBe(1);
    expect(accepted.get(`appointment-update/${id}`)).toMatchObject({
      to: [recipient],
      subject,
      text: body,
    });
  });

  it("schedules reviewed reminders only for the exact upcoming version and recipient", async () => {
    const message = create();
    const originalTime = now;
    const scheduledFor = "2026-10-05T08:00:00.000Z";
    try {
      const pending = await enqueue({ ...message, scheduledFor });
      expect(pending).toMatchObject({ state: "pending", scheduledFor, attempts: 0 });
      const events = await prisma.outboxEvent.findMany({
        where: { tenantId: scope.tenantId, eventType: APPOINTMENT_DELIVERY_REQUESTED },
      });
      const reminder = events.find(
        (item) => JSON.parse(item.payloadJson).deliveryId === pending.deliveryId
      );
      expect(reminder?.availableAt.toISOString()).toBe(scheduledFor);
      await dispatch(pending.deliveryId);
      expect(accepted.has("appointment-update/" + pending.deliveryId)).toBe(false);
      current.delete(message.bookingId);
      now = new Date(scheduledFor);
      await dispatch(pending.deliveryId);
      expect(await deliveries.getStatus(scope, pending.deliveryId)).toMatchObject({
        state: "superseded",
        attempts: 0,
      });
      const futureMessage = create();
      const valid = await enqueue({ ...futureMessage, scheduledFor: "2026-10-05T08:30:00.000Z" });
      now = new Date("2026-10-05T08:30:00.000Z");
      await dispatch(valid.deliveryId);
      expect(accepted.get("appointment-update/" + valid.deliveryId)).toMatchObject({
        to: [recipient],
        subject,
        text: body,
      });
      await expect(
        enqueue({ ...create(), scheduledFor: "2026-10-05T10:00:00.000Z" })
      ).rejects.toThrow("Notifications:ReminderScheduleInvalid");
    } finally {
      now = originalTime;
    }
  });

  it("invalidates a superseded appointment and bounds retries even after a stalled worker", async () => {
    const message = create();
    const obsolete = await enqueue(message);
    current.set(message.bookingId, "2026-10-01T00:02:30.000Z");
    await dispatch(obsolete.deliveryId);
    expect(await deliveries.getStatus(scope, obsolete.deliveryId)).toMatchObject({
      state: "superseded",
      attempts: 0,
    });
    expect(accepted.has(`appointment-update/${obsolete.deliveryId}`)).toBe(false);

    const expired = await enqueue(create());
    now = new Date("2026-10-01T01:03:00.000Z");
    await dispatch(expired.deliveryId);
    expect(await deliveries.getStatus(scope, expired.deliveryId)).toMatchObject({
      state: "failed",
      attempts: 0,
      retryable: false,
    });
    expect(accepted.has(`appointment-update/${expired.deliveryId}`)).toBe(false);
  });
});
