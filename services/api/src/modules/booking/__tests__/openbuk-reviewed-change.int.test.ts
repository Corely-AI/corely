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
import type { UseCaseContext } from "@corely/kernel";
import { StaffProfileSchema, type StaffAbsenceRevision } from "@corely/contracts";
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
  let staffRepository: ExtStaffRepositoryAdapter;
  let staffSchedules: ExtStaffAvailabilityAdapter;
  let absences: ExtStaffAbsenceAdapter;

  async function book(startAt: string) {
    return studioApp.book(
      {
        serviceId,
        staffId,
        startAt,
        customer: { name: "Synthetic guest", email: "guest@example.test" },
        consentAccepted: true,
      },
      randomUUID(),
      guest
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
    staffRepository = new ExtStaffRepositoryAdapter(prisma, kv);
    staffSchedules = new ExtStaffAvailabilityAdapter(kv);
    absences = new ExtStaffAbsenceAdapter(prisma, kv);
    const staff = new StaffAvailabilityConstraintService(staffRepository, staffSchedules, absences);
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
      { publish: async () => {} },
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
      new RescheduleBookingUseCase(bookings, audit, outbox, { newId: randomUUID }, clock, uow, []),
      staff
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

  it("sources absence impact from latest People state and excludes private details", async () => {
    const { receipt } = await book("2026-10-19T07:00:00Z");
    const booking = await prisma.booking.findFirstOrThrow({
      where: { ...scope, referenceNumber: receipt.reference },
    });
    const input = { bookingId: booking.id, startAt: "2026-10-19T09:00:00Z" };
    await expect(changes.previewAbsenceReplacement(input, manager)).rejects.toThrow(
      "Booking:NoApprovedAbsenceImpact"
    );

    const employee = randomUUID();
    const changedAt = "2026-10-01T00:00:00.000Z";
    const startAt = "2026-10-19T06:00:00.000Z";
    const endAt = "2026-10-19T08:00:00.000Z";
    const approved: StaffAbsenceRevision = {
      range: { kind: "partial-day", timezone: "Europe/Berlin", startAt, endAt },
      startAt,
      endAt,
      changedAt,
      changedBy: "personnel-manager",
      reason: "private-personnel-value",
      notes: "another-private-value",
      status: "approved",
      version: 1,
    };
    const record = {
      id: randomUUID(),
      staffId: employee,
      workspaceId: scope.workspaceId,
      revisions: [approved],
    };
    await uow.withinTransaction(async (tx) => {
      await staffRepository.save(
        scope,
        StaffProfileSchema.parse({
          id: employee,
          workspaceId: scope.workspaceId,
          displayName: "Lena",
          resourceId: staffId,
          version: 1,
          archivedAt: null,
          createdAt: changedAt,
          updatedAt: changedAt,
        }),
        tx
      );
      await staffSchedules.save(
        scope,
        employee,
        {
          version: 1,
          plans: [
            {
              revision: 1,
              startsAt: changedAt,
              endsAt: null,
              pattern: {
                timezone: "Europe/Berlin",
                effectiveFrom: "2026-10-01",
                effectiveUntil: null,
                weeklyHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }],
                exceptions: [],
              },
            },
          ],
        },
        tx
      );
      await absences.save(scope, record, tx);
    });
    const preview = await changes.previewAbsenceReplacement(input, manager);
    expect(preview.absenceImpact).toBe(true);
    expect(JSON.stringify(preview)).not.toContain("private");
    expect(JSON.stringify(preview)).not.toContain(record.id);

    await uow.withinTransaction((tx) =>
      absences.save(
        scope,
        {
          ...record,
          revisions: [
            approved,
            { ...approved, status: "cancelled", version: 2, changedAt: "2026-10-02T00:00:00.000Z" },
          ],
        },
        tx
      )
    );
    await expect(
      uow.withinTransaction((tx) => changes.applyReviewed(preview, randomUUID(), manager, tx))
    ).rejects.toThrow("Booking:ReviewStale");
    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(unchanged.startAt).toEqual(booking.startAt);
  });
});
