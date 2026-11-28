import { randomUUID } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaService,
  PrismaUnitOfWork,
} from "@corely/data";
import { APPOINTMENT_DELIVERY_REQUESTED, AppointmentDeliveryEventSchema } from "@corely/contracts";
import type { EmailSenderPort, SendEmailRequest, UseCaseContext } from "@corely/kernel";
import { AppointmentDeliveryUseCase } from "../../notifications/application/use-cases/appointment-delivery.usecase";
import { PrismaAppointmentDeliveryStore } from "../../notifications/infrastructure/prisma-appointment-delivery.store";
import { AppointmentDeliveryHandler } from "../../background/runtime/modules/booking/appointment-delivery.handler";
import { OpenBukBookingCreatedHandler } from "../../background/runtime/modules/booking/openbuk-booking-created.handler";
import { OpenBukAppointmentChangeUseCase } from "../application/use-cases/openbuk-appointment-change.usecase";
import { OpenBukStudioUseCase } from "../application/use-cases/openbuk-studio.usecase";
import { RescheduleBookingUseCase } from "../application/use-cases/reschedule-booking.usecase";
import { BookingStaffConstraintAdapter } from "../infrastructure/adapters/booking-staff-constraint.adapter";
import { PrismaBookingRepoAdapter } from "../infrastructure/adapters/prisma-booking-repo.adapter";
import { PrismaOpenBukRepositoryAdapter } from "../infrastructure/adapters/prisma-openbuk-repository.adapter";
import { StaffAvailabilityConstraintService } from "../../people/public";
import { ExtStaffAbsenceAdapter } from "../../people/infrastructure/ext-staff-absence.adapter";
import { ExtStaffAvailabilityAdapter } from "../../people/infrastructure/ext-staff-availability.adapter";
import { ExtStaffRepositoryAdapter } from "../../people/infrastructure/ext-staff-repository.adapter";
import { studioFixture } from "./openbuk-fixtures";

const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Reviewed appointment replacement", () => {
  const scope = { tenantId: randomUUID(), workspaceId: randomUUID() };
  const manager: UseCaseContext = { ...scope, userId: "manager" };
  const guest: UseCaseContext = {
    ...scope,
    metadata: {
      public: {
        workspaceSlug: "test-studio",
        resolutionMethod: "path",
        publicEnabled: true,
        publicModules: { booking: true },
      },
    },
  };
  let prisma: PrismaService;
  let uow: PrismaUnitOfWork;
  let studioApp: OpenBukStudioUseCase;
  let changes: OpenBukAppointmentChangeUseCase;
  let appointment: { bookingId: string; startAt: string };
  let serviceId: string;
  let staffId: string;

  async function book(startAt: string, preference?: boolean, ctx = guest) {
    return studioApp.book(
      {
        serviceId,
        staffId,
        startAt,
        customer: { name: "Synthetic guest", email: "guest@example.test" },
        consentAccepted: true,
        locale: "vi",
        ...(preference === undefined ? {} : { confirmationEmailRequested: preference }),
      },
      randomUUID(),
      ctx
    );
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    uow = new PrismaUnitOfWork(prisma);
    const audit = new PrismaAuditAdapter(prisma);
    const outbox = new PrismaOutboxAdapter(prisma);
    const kv = new PrismaExtKvAdapter(prisma);
    const staff = new StaffAvailabilityConstraintService(
      new ExtStaffRepositoryAdapter(prisma, kv),
      new ExtStaffAvailabilityAdapter(kv),
      new ExtStaffAbsenceAdapter(prisma, kv)
    );
    const authorize = {
      execute: async (input: typeof scope & { userId: string }) => {
        if (
          input.workspaceId !== scope.workspaceId ||
          input.tenantId !== scope.tenantId ||
          input.userId !== "manager"
        ) {
          throw new ForbiddenException("Manager required");
        }
        return { slug: "test-studio", name: "Studio" };
      },
    };
    const clock = { now: () => new Date("2026-10-01T00:00:00Z") };
    const studioRepository = new PrismaOpenBukRepositoryAdapter(prisma, kv);
    studioApp = new OpenBukStudioUseCase(
      studioRepository,
      uow,
      audit,
      outbox,
      clock,
      authorize,
      { publish: async () => {}, requirePublicBooking: async () => {} },
      staff
    );
    const bookings = new PrismaBookingRepoAdapter(
      prisma,
      new BookingStaffConstraintAdapter(prisma, staff)
    );
    changes = new OpenBukAppointmentChangeUseCase(
      bookings,
      studioRepository,
      studioApp,
      authorize,
      clock,
      [],
      new RescheduleBookingUseCase(bookings, audit, outbox, { newId: randomUUID }, clock, uow, [])
    );
    const fixture = studioFixture();
    const { serviceId: unusedService, staffId: unusedStaff, slug, ...setup } = fixture;
    const { studio } = await studioApp.configure(setup, manager);
    ({ serviceId, staffId } = studio);
    const { receipt } = await book("2026-10-12T07:00:00Z");
    const row = await prisma.booking.findFirstOrThrow({
      where: { ...scope, referenceNumber: receipt.reference },
    });
    appointment = { bookingId: row.id, startAt: "2026-10-12T09:00:00Z" };
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    const { tenantId } = scope;
    await prisma.bookingAllocation.deleteMany({ where: { tenantId } });
    await prisma.booking.deleteMany({ where: scope });
    await prisma.bookingAvailabilityRule.deleteMany({ where: { tenantId } });
    await prisma.bookingResource.deleteMany({ where: scope });
    await prisma.bookingServiceOffering.deleteMany({ where: scope });
    await prisma.extKv.deleteMany({ where: { tenantId } });
    await prisma.idempotencyKey.deleteMany({ where: { tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.onModuleDestroy();
  });

  it("isolates preview, rechecks competing commitments and applies only the exact reviewed slot", async () => {
    await expect(changes.preview(appointment, { ...manager, userId: "staff" })).rejects.toThrow(
      "Manager required"
    );
    await expect(
      changes.preview(appointment, { ...manager, workspaceId: randomUUID() })
    ).rejects.toThrow("Manager required");

    const approved = await changes.preview(appointment, manager);
    expect(approved.current.startAt).toBe("2026-10-12T07:00:00.000Z");
    expect(approved.replacement).toMatchObject({
      startAt: "2026-10-12T09:00:00.000Z",
      resourceId: staffId,
    });
    expect(Object.keys(approved)).not.toContain("customer");
    const events = () =>
      prisma.outboxEvent.count({
        where: { tenantId: scope.tenantId, eventType: "booking.rescheduled" },
      });
    expect(await events()).toBe(0);

    await book("2026-10-12T09:00:00Z");
    const apply = (payload = approved) =>
      uow.withinTransaction((tx) => changes.applyReviewed(payload, randomUUID(), manager, tx));
    await expect(apply()).rejects.toThrow("Booking:SlotUnavailable");
    expect(await events()).toBe(0);

    const newPlan = await changes.preview(
      { ...appointment, startAt: "2026-10-12T10:00:00Z" },
      manager
    );
    await expect(apply({ ...newPlan, version: "2026-10-01T00:00:00.000Z" })).rejects.toThrow(
      "Booking:ReviewStale"
    );
    const result = await apply(newPlan);
    expect(result.appointment).toEqual(newPlan.replacement);
    expect(result.version).not.toBe(newPlan.version);
    expect(await events()).toBe(1);
  });

  it("delivers a committed opt-in once through Notifications and keeps opted-out, unpublished and imported requests silent", async () => {
    const clock = { now: () => new Date("2026-10-01T00:00:00Z") };
    const outbox = new PrismaOutboxAdapter(prisma);
    const deliveries = new AppointmentDeliveryUseCase(
      new PrismaAppointmentDeliveryStore(prisma, new PrismaExtKvAdapter(prisma)),
      changes,
      uow,
      outbox,
      clock
    );
    const createdHandler = new OpenBukBookingCreatedHandler(deliveries);
    const accepted = new Map<string, SendEmailRequest>();
    const sink: EmailSenderPort = {
      sendEmail: async (message) => {
        const key = message.idempotencyKey ?? "";
        if (!accepted.has(key)) {
          accepted.set(key, message);
          throw new Error("Synthetic provider response lost");
        }
        return { provider: "isolated-test-sink", providerMessageId: "synthetic" };
      },
    };
    const requested = () =>
      prisma.outboxEvent.findMany({
        where: { tenantId: scope.tenantId, eventType: APPOINTMENT_DELIVERY_REQUESTED },
      });
    const bookingEvent = async (reference: string) => {
      const row = await prisma.booking.findFirstOrThrow({
        where: { ...scope, referenceNumber: reference },
      });
      const matches = await prisma.outboxEvent.findMany({
        where: { tenantId: scope.tenantId, eventType: "booking.created" },
      });
      const event = matches.find((record) => JSON.parse(record.payloadJson).bookingId === row.id)!;
      return {
        id: event.id,
        tenantId: event.tenantId,
        eventType: event.eventType,
        payload: JSON.parse(event.payloadJson),
      };
    };

    await expect(
      book("2026-10-12T12:00:00.000Z", true, {
        ...guest,
        metadata: {
          public: {
            workspaceSlug: "test-studio",
            resolutionMethod: "path",
            publicEnabled: false,
            publicModules: { booking: true },
          },
        },
      })
    ).rejects.toThrow();
    expect(
      await prisma.booking.count({
        where: { ...scope, startAt: new Date("2026-10-12T12:00:00.000Z") },
      })
    ).toBe(0);
    for (const [time, preference] of [
      ["12:00", undefined],
      ["13:00", false],
    ] as const) {
      const { receipt } = await book(`2026-10-12T${time}:00.000Z`, preference);
      await createdHandler.handle(await bookingEvent(receipt.reference));
    }
    const { receipt } = await book("2026-10-12T14:00:00.000Z", true);
    const event = await bookingEvent(receipt.reference);
    expect(Object.keys(event.payload).sort()).toEqual([
      "bookingId",
      "source",
      "status",
      "workspaceId",
    ]);
    expect(JSON.stringify(event.payload)).not.toContain("guest@example.test");
    await createdHandler.handle({
      ...event,
      payload: { ...event.payload, source: "openbuk-import" },
    });
    await createdHandler.handle({
      ...event,
      payload: { ...event.payload, workspaceId: randomUUID() },
    });
    expect(await requested()).toHaveLength(0);
    expect(accepted.size).toBe(0);

    await Promise.all([
      createdHandler.handle(event),
      createdHandler.handle({ ...event, id: randomUUID() }),
    ]);
    const pending = await requested();
    expect(pending).toHaveLength(1);
    const payload = AppointmentDeliveryEventSchema.parse(JSON.parse(pending[0]!.payloadJson));
    const handler = new AppointmentDeliveryHandler(deliveries, sink);
    const deliveryEvent = {
      id: pending[0]!.id,
      tenantId: scope.tenantId,
      eventType: APPOINTMENT_DELIVERY_REQUESTED,
      payload,
    };
    await expect(handler.handle(deliveryEvent)).rejects.toThrow(
      "Appointment update sender unavailable"
    );
    expect(await deliveries.getStatus(scope, payload.deliveryId)).toMatchObject({
      state: "failed",
      attempts: 1,
    });
    await handler.handle(deliveryEvent);
    await createdHandler.handle(event);
    await handler.handle(deliveryEvent);
    expect(await requested()).toHaveLength(1);
    expect(await deliveries.getStatus(scope, payload.deliveryId)).toMatchObject({
      state: "accepted",
      attempts: 2,
    });
    expect(accepted.size).toBe(1);
    expect([...accepted.values()][0]).toMatchObject({
      to: ["guest@example.test"],
      subject: "Đã xác nhận lịch hẹn",
    });
    expect([...accepted.values()][0]?.text).toMatch(/Thời gian — .*16:00.*\(Europe\/Berlin\)/);

    const cancelled = await book("2026-10-12T15:00:00.000Z", true);
    const cancelledEvent = await bookingEvent(cancelled.receipt.reference);
    await createdHandler.handle(cancelledEvent);
    const cancelledDelivery = (await requested()).find((row) => row.id !== pending[0]!.id)!;
    const cancelledPayload = AppointmentDeliveryEventSchema.parse(
      JSON.parse(cancelledDelivery.payloadJson)
    );
    await prisma.booking.update({
      where: { id: cancelledEvent.payload.bookingId, ...scope },
      data: { status: "CANCELLED" },
    });
    await handler.handle({
      id: cancelledDelivery.id,
      tenantId: scope.tenantId,
      eventType: APPOINTMENT_DELIVERY_REQUESTED,
      payload: cancelledPayload,
    });
    expect(await deliveries.getStatus(scope, cancelledPayload.deliveryId)).toMatchObject({
      state: "superseded",
      attempts: 0,
    });
    expect(accepted.size).toBe(1);
  });
});
