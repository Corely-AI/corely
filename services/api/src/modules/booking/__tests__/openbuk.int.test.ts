import { CreateBookingUseCase } from "../application/use-cases/create-booking.usecase";
import { PrismaHoldRepoAdapter } from "../infrastructure/adapters/prisma-hold-repo.adapter";
import { PrismaResourceRepoAdapter } from "../infrastructure/adapters/prisma-resource-repo.adapter";
import { BookingHold } from "../domain/booking.entities";
import { acmeBookingPolicy } from "@acme/booking-policy-fixture";
import { ExtStaffAbsenceAdapter } from "../../people/infrastructure/ext-staff-absence.adapter";
import { StaffAvailabilityConstraintService } from "../../people/public";
import { ExtStaffRepositoryAdapter } from "../../people/infrastructure/ext-staff-repository.adapter";
import { ExtStaffAvailabilityAdapter } from "../../people/infrastructure/ext-staff-availability.adapter";
import { BookingStaffConstraintAdapter } from "../infrastructure/adapters/booking-staff-constraint.adapter";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  PrismaService,
  PrismaUnitOfWork,
  PrismaAuditAdapter,
  PrismaOutboxAdapter,
  PrismaExtKvAdapter,
} from "@corely/data";
import type { UseCaseContext } from "@corely/kernel";
import { PrismaOpenBukRepositoryAdapter } from "../infrastructure/adapters/prisma-openbuk-repository.adapter";
import { PrismaBookingRepoAdapter } from "../infrastructure/adapters/prisma-booking-repo.adapter";
import { OpenBukStudioUseCase } from "../application/use-cases/openbuk-studio.usecase";
import { BookingEntity, BookingAllocation } from "../domain/booking.entities";
import { studioFixture } from "./openbuk-fixtures";

// This suite intentionally never uses the developer's default DATABASE_URL.
const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("OpenBuk PostgreSQL transaction boundary", () => {
  let prisma: PrismaService;
  let repo: PrismaOpenBukRepositoryAdapter;
  let app: OpenBukStudioUseCase;
  let staff: StaffAvailabilityConstraintService;
  const tenantId = randomUUID();
  const workspaceId = randomUUID();
  const scope = { tenantId, workspaceId };
  const ctx: UseCaseContext = {
    ...scope,
    userId: "owner",
    metadata: {
      public: {
        workspaceSlug: "test-studio",
        resolutionMethod: "path",
        publicEnabled: true,
        publicModules: { booking: true },
      },
    },
  };
  const now = new Date("2026-10-01T00:00:00Z");
  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    staff = new StaffAvailabilityConstraintService(
      new ExtStaffRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma)),
      new ExtStaffAvailabilityAdapter(new PrismaExtKvAdapter(prisma)),
      new ExtStaffAbsenceAdapter(prisma, new PrismaExtKvAdapter(prisma))
    );
    repo = new PrismaOpenBukRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma));
    app = new OpenBukStudioUseCase(
      repo,
      new PrismaUnitOfWork(prisma),
      new PrismaAuditAdapter(prisma),
      new PrismaOutboxAdapter(prisma),
      { now: () => now },
      { execute: async () => ({ slug: "test-studio", name: "Studio" }) },
      { publish: async () => {} },
      staff
    );
    const { serviceId, staffId, slug, ...setup } = studioFixture();
    await app.configure(setup, ctx);
  });
  afterAll(async () => {
    if (!prisma) {
      return;
    }
    await prisma.bookingAllocation.deleteMany({ where: { tenantId } });
    await prisma.booking.deleteMany({ where: { tenantId } });
    await prisma.bookingAvailabilityRule.deleteMany({ where: { tenantId } });
    await prisma.bookingResource.deleteMany({ where: { tenantId } });
    await prisma.bookingServiceOffering.deleteMany({ where: { tenantId } });
    await prisma.extKv.deleteMany({ where: { tenantId } });
    await prisma.idempotencyKey.deleteMany({ where: { tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.onModuleDestroy();
  });
  async function input(startAt = "2026-10-05T07:00:00Z") {
    const studio = await repo.studio(scope);
    if (!studio) {
      throw new Error("Missing fixture");
    }
    return {
      serviceId: studio.serviceId,
      staffId: studio.staffId,
      startAt,
      customer: { name: "Guest", email: "guest@example.test" },
      consentAccepted: true as const,
    };
  }
  it("preserves bookings, explicit studio notice and the policy across candidate composition", async () => {
    const policyClock = { now: () => new Date("2026-10-03T08:00:00Z") };
    const createBuild = () =>
      new OpenBukStudioUseCase(
        repo,
        new PrismaUnitOfWork(prisma),
        new PrismaAuditAdapter(prisma),
        new PrismaOutboxAdapter(prisma),
        policyClock,
        { execute: async () => ({ slug: "test-studio", name: "Studio" }) },
        { publish: async () => {} },
        staff,
        [{ ...scope, validate: acmeBookingPolicy }]
      );
    const baseline = createBuild();
    const { serviceId, staffId, slug, ...setup } = studioFixture({
      durationMinutes: 120,
      bufferAfterMinutes: 0,
      minimumNoticeMinutes: 1440,
      weeklyHours: [{ dayOfWeek: 1, startTime: "08:00", endTime: "18:00" }],
    });
    await baseline.configure(setup, ctx);
    try {
      const rejected = await input("2026-10-05T07:00:00Z");
      const accepted = await input("2026-10-05T08:00:00Z");
      const key = randomUUID();
      const before = await prisma.outboxEvent.count({
        where: { tenantId, eventType: "booking.created" },
      });
      await expect(baseline.book(rejected, randomUUID(), ctx)).rejects.toMatchObject({
        response: { code: "Booking:PolicyRejected" },
      });
      expect(await prisma.booking.count({ where: scope })).toBe(0);
      expect(
        await prisma.outboxEvent.count({ where: { tenantId, eventType: "booking.created" } })
      ).toBe(before);
      const existing = await baseline.book(accepted, key, ctx);
      const candidate = createBuild();
      expect((await repo.studio(scope))?.minimumNoticeMinutes).toBe(1440);
      expect(await candidate.book(accepted, key, ctx)).toEqual(existing);
      expect(await prisma.booking.count({ where: scope })).toBe(1);
      const remainingEarlierSlot = await input("2026-10-05T06:00:00Z");
      await expect(candidate.book(remainingEarlierSlot, randomUUID(), ctx)).rejects.toMatchObject({
        response: { code: "Booking:PolicyRejected" },
      });
    } finally {
      await prisma.bookingAllocation.deleteMany({ where: { tenantId } });
      await prisma.booking.deleteMany({ where: scope });
      await prisma.outboxEvent.deleteMany({ where: { tenantId } });
      await prisma.auditLog.deleteMany({ where: { tenantId } });
      const { serviceId, staffId, slug, ...defaultSetup } = studioFixture();
      await app.configure(defaultSetup, ctx);
    }
  });
  it("rejects direct and held staff bookings before writing or consuming a hold", async () => {
    const resource = await input();
    const staffConstraint = new BookingStaffConstraintAdapter(prisma, staff);
    const holds = new PrismaHoldRepoAdapter(prisma, staffConstraint);
    const clock = { now: () => new Date("2026-10-03T08:00:00Z") };
    const create = new CreateBookingUseCase(
      new PrismaBookingRepoAdapter(prisma, staffConstraint),
      holds,
      new PrismaResourceRepoAdapter(prisma),
      new PrismaAuditAdapter(prisma),
      new PrismaOutboxAdapter(prisma),
      { get: async () => null, store: async () => {} },
      { newId: randomUUID },
      clock,
      [{ ...scope, validate: acmeBookingPolicy }]
    );
    const start = new Date(resource.startAt);
    const end = new Date(start.getTime() + 120 * 60_000);
    const booking = {
      startAt: start,
      endAt: end,
      resourceIds: [resource.staffId],
      serviceOfferingId: resource.serviceId,
    };
    const rejection = { response: { code: "Booking:PolicyRejected" } };
    await expect(create.execute(booking, ctx)).rejects.toMatchObject(rejection);
    const holdId = randomUUID();
    await holds.create(
      new BookingHold(
        holdId,
        tenantId,
        workspaceId,
        "ACTIVE",
        start,
        end,
        resource.serviceId,
        [resource.staffId],
        new Date(Date.now() + 600_000),
        null,
        null,
        null,
        null,
        null,
        "owner",
        clock.now()
      )
    );
    try {
      await expect(create.execute({ holdId }, ctx)).rejects.toMatchObject(rejection);
      expect((await holds.findById(holdId, tenantId))?.status).toBe("ACTIVE");
      expect(await prisma.booking.count({ where: scope })).toBe(0);
      expect(await prisma.bookingAllocation.count({ where: { tenantId } })).toBe(0);
      expect(
        await prisma.outboxEvent.count({ where: { tenantId, eventType: "booking.created" } })
      ).toBe(0);
    } finally {
      await prisma.bookingHold.deleteMany({ where: { id: holdId, tenantId } });
    }
  });
  it("allows exactly one of two simultaneous requests for the same staff/slot", async () => {
    const body = await input();
    const results = await Promise.allSettled([
      app.book(body, randomUUID(), ctx),
      app.book(body, randomUUID(), ctx),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason.message).toBe(
      "Booking:SlotUnavailable"
    );
    expect(await prisma.booking.count({ where: scope })).toBe(1);
    expect(
      await prisma.outboxEvent.count({ where: { tenantId, eventType: "booking.created" } })
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { tenantId, action: "booking.created" } })).toBe(1);
    expect((await app.appointments("2026-10-05", ctx)).appointments[0]?.customerName).toBe("Guest");
    const projection = await app.operationalAppointments("2026-10-05", "Europe/Berlin", ctx);
    expect(projection).toHaveLength(1);
    expect(Object.keys(projection[0]).sort()).toEqual([
      "allocations",
      "endAt",
      "id",
      "startAt",
      "status",
    ]);
    expect(JSON.stringify(projection)).not.toContain("Guest");
  });
  it("replays concurrent retries, rejects changed payloads and does not duplicate events", async () => {
    const body = await input("2026-10-05T09:00:00Z");
    const key = randomUUID();
    const [a, b] = await Promise.all([app.book(body, key, ctx), app.book(body, key, ctx)]);
    expect(a).toEqual(b);
    expect(a.receipt.priceCents).toBe(3500);
    expect(a.receipt.endAt).toBe("2026-10-05T09:45:00.000Z");
    await expect(
      app.book({ ...body, customer: { ...body.customer, name: "Changed" } }, key, ctx)
    ).rejects.toThrow("Booking:IdempotencyMismatch");
    expect(await prisma.booking.count({ where: scope })).toBe(2);
  });
  it("does not resolve another workspace or tenant's configuration", async () => {
    expect(await repo.studio({ ...scope, workspaceId: randomUUID() })).toBeNull();
    expect(await repo.studio({ ...scope, tenantId: randomUUID() })).toBeNull();
    await expect(
      app.book(await input(), randomUUID(), { ...ctx, workspaceId: randomUUID() })
    ).rejects.toThrow("Booking:ServiceUnavailable");
    await expect(app.publicStudio({ ...ctx, metadata: {} })).rejects.toThrow();
    const publicResult = await app.publicStudio(ctx);
    expect(publicResult.studio).not.toHaveProperty("tenantId");
    expect(publicResult.studio).not.toHaveProperty("blockedTimes");
  });
  it("blocks legacy checkout for registered studios even when their service is inactive", async () => {
    await expect(app.assertLegacyPublicBookingAllowed(ctx)).rejects.toThrow("OpenBuk");
    const studio = await repo.studio(scope);
    await prisma.bookingServiceOffering.update({
      where: { id: studio!.serviceId },
      data: { isActive: false },
    });
    try {
      expect(await repo.studio(scope)).toBeNull();
      await expect(app.assertLegacyPublicBookingAllowed(ctx)).rejects.toThrow("OpenBuk");
      await expect(
        app.assertLegacyPublicBookingAllowed({ ...ctx, workspaceId: randomUUID() })
      ).resolves.toBeUndefined();
    } finally {
      await prisma.bookingServiceOffering.update({
        where: { id: studio!.serviceId },
        data: { isActive: true },
      });
    }
  });
  it("rejects a forged time, service, staff or missing idempotency key", async () => {
    await expect(app.book(await input("2026-10-05T01:00:00Z"), randomUUID(), ctx)).rejects.toThrow(
      "Booking:SlotUnavailable"
    );
    const body = await input("2026-10-05T10:00:00Z");
    await expect(app.book({ ...body, serviceId: randomUUID() }, randomUUID(), ctx)).rejects.toThrow(
      "Booking:ServiceUnavailable"
    );
    await expect(app.book({ ...body, staffId: randomUUID() }, randomUUID(), ctx)).rejects.toThrow(
      "Booking:ServiceUnavailable"
    );
    await expect(app.book(body, "", ctx)).rejects.toThrow("Idempotency-Key");
  });
  it("rolls back booking, receipt and audit when outbox persistence fails", async () => {
    const failing = new OpenBukStudioUseCase(
      repo,
      new PrismaUnitOfWork(prisma),
      new PrismaAuditAdapter(prisma),
      {
        enqueue: async () => {
          throw new Error("outbox unavailable");
        },
      },
      { now: () => now },
      { execute: async () => ({ slug: "test-studio", name: "Studio" }) },
      { publish: async () => {} },
      staff
    );
    const key = randomUUID();
    const body = await input("2026-10-05T11:00:00Z");
    const before = await prisma.booking.count({ where: scope });
    await expect(failing.book(body, key, ctx)).rejects.toThrow("outbox unavailable");
    expect(await prisma.booking.count({ where: scope })).toBe(before);
    expect(await prisma.idempotencyKey.count({ where: { tenantId, key } })).toBe(0);
    await expect(app.book(body, key, ctx)).resolves.toHaveProperty("receipt");
  });
  it("serializes OpenBuk against an existing Corely booking writer", async () => {
    const body = await input("2026-10-05T13:00:00Z");
    const id = randomUUID();
    const start = new Date(body.startAt);
    const end = new Date(start.getTime() + 3600000);
    const entity = new BookingEntity(
      id,
      tenantId,
      workspaceId,
      "CONFIRMED",
      start,
      end,
      "legacy",
      body.serviceId,
      null,
      "Admin",
      null,
      null,
      null,
      null,
      null,
      "owner",
      now,
      now,
      []
    );
    const allocation = new BookingAllocation(
      randomUUID(),
      tenantId,
      id,
      body.staffId,
      "PRIMARY",
      start,
      end,
      now
    );
    const results = await Promise.allSettled([
      app.book(body, randomUUID(), ctx),
      new PrismaBookingRepoAdapter(prisma, new BookingStaffConstraintAdapter(prisma, staff)).create(
        entity,
        [allocation]
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});
