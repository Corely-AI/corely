import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { PrismaService, PrismaExtKvAdapter, PrismaUnitOfWork } from "@corely/data";
import type { StaffPattern } from "@corely/contracts";
import { staffFixture } from "./staff-fixture";
import { StaffAvailabilityUseCase } from "../application/staff-availability.usecase";
import { OpenBukStudioUseCase } from "../../booking/application/use-cases/openbuk-studio.usecase";
import { PrismaOpenBukRepositoryAdapter } from "../../booking/infrastructure/adapters/prisma-openbuk-repository.adapter";
import { PrismaBookingRepoAdapter } from "../../booking/infrastructure/adapters/prisma-booking-repo.adapter";
import { PrismaHoldRepoAdapter } from "../../booking/infrastructure/adapters/prisma-hold-repo.adapter";
import { BookingStaffConstraintAdapter } from "../../booking/infrastructure/adapters/booking-staff-constraint.adapter";
import {
  BookingEntity,
  BookingAllocation,
  BookingHold,
} from "../../booking/domain/booking.entities";
import { studioFixture } from "../../booking/__tests__/openbuk-fixtures";
import { CreateBookingUseCase } from "../../booking/application/use-cases/create-booking.usecase";
import { PrismaResourceRepoAdapter } from "../../booking/infrastructure/adapters/prisma-resource-repo.adapter";
const url = process.env.PEOPLE_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/people_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("People patterns constrain authoritative Booking", () => {
  let prisma: PrismaService;
  let f: Awaited<ReturnType<typeof staffFixture>>;
  let openbuk: OpenBukStudioUseCase;
  let staffId: string;
  let resourceId: string;
  const now = new Date("2026-11-07T12:00:00Z");
  const clock = { now: () => now };
  const pattern = (overrides: Partial<StaffPattern> = {}): StaffPattern => ({
    timezone: "Europe/Berlin",
    effectiveFrom: "2026-11-09",
    effectiveUntil: null,
    weeklyHours: [{ dayOfWeek: 1, startTime: "10:00", endTime: "14:00" }],
    exceptions: [],
    ...overrides,
  });
  const publicCtx = () => ({
    ...f.ctx,
    userId: undefined,
    metadata: {
      public: {
        workspaceSlug: "test-studio",
        resolutionMethod: "path",
        publicEnabled: true,
        publicModules: { booking: true },
      },
    },
  });
  const save = async (p: StaffPattern, key = randomUUID()) => {
    const view = await f.availability.detail(staffId, f.ctx);
    return f.availability.save(
      staffId,
      { version: view.version, profileVersion: view.profileVersion, pattern: p },
      key,
      f.ctx
    );
  };
  const post = (body: object, token = "manager", workspace?: string, key = randomUUID()) =>
    request(f.app.getHttpServer())
      .post(`/people/staff/${staffId}/availability`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", workspace ?? f.workspaceA)
      .set("X-Idempotency-Key", key)
      .send(body);
  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    f = await staffFixture(prisma, clock);
    openbuk = new OpenBukStudioUseCase(
      new PrismaOpenBukRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma)),
      new PrismaUnitOfWork(prisma),
      f.audit,
      f.outbox,
      clock,
      { execute: async () => ({ slug: "test-studio", name: "Studio" }) },
      { publish: async () => {} },
      f.constraint
    );
    const { serviceId, staffId: unused, slug, ...setup } = studioFixture();
    const studio = (await openbuk.configure(setup, f.ctx)).studio;
    resourceId = studio.staffId;
    staffId = (
      await f.usecase.command(
        "create",
        null,
        { displayName: "Availability owner", resourceId },
        randomUUID(),
        f.ctx
      )
    ).id;
  });
  afterAll(async () => {
    await f?.cleanup();
    await prisma?.onModuleDestroy();
  });
  it("closes linked staff without patterns and preserves unlinked resources", async () => {
    expect((await openbuk.availability("2026-11-09", publicCtx())).slots).toEqual([]);
    expect(
      await f.constraint.windows(
        { tenantId: f.tenantA, workspaceId: f.workspaceA },
        f.resource.id,
        new Date("2026-11-09"),
        new Date("2026-11-10")
      )
    ).toBeNull();
    const unlinked = await f.usecase.command(
      "create",
      null,
      { displayName: "No resource required" },
      randomUUID(),
      f.ctx
    );
    await f.availability.save(
      unlinked.id,
      { version: 0, profileVersion: 1, pattern: pattern() },
      randomUUID(),
      f.ctx
    );
    expect((await f.availability.detail(unlinked.id, f.ctx)).resourceId).toBeNull();
  });
  it("intersects staff windows with resource hours, service duration and buffers", async () => {
    await save(pattern());
    const slots = (await openbuk.availability("2026-11-09", publicCtx())).slots;
    expect(slots[0].startAt).toBe("2026-11-09T09:00:00.000Z");
    expect(slots.at(-1)!.startAt).toBe("2026-11-09T12:00:00.000Z");
    await save(pattern({ exceptions: [{ date: "2026-11-09", windows: [] }] }));
    expect((await openbuk.availability("2026-11-09", publicCtx())).slots).toEqual([]);
    await save(pattern());
  });
  it("replaces pending civil dates across timezone changes and retains earlier effective history", async () => {
    const first = await save(pattern({ effectiveFrom: "2026-11-07" }));
    const history = first.plans.find((p) => p.pattern.effectiveFrom === "2026-11-07")!;
    await save(pattern({ effectiveFrom: "2026-11-09", timezone: "UTC" }));
    const next = await save(pattern({ effectiveFrom: "2026-11-09", timezone: "America/New_York" }));
    expect(next.plans.filter((p) => p.pattern.effectiveFrom === "2026-11-09")).toHaveLength(1);
    expect(next.plans.find((p) => p.pattern.effectiveFrom === "2026-11-07")).toEqual(history);
    expect(history.startsAt).toBe("2026-11-07T12:00:00.000Z");
    await save(pattern());
  });
  it("enforces manager permissions, actual workspace scope, strict bodies, past dates and versions over HTTP", async () => {
    const view = await f.availability.detail(staffId, f.ctx);
    const body = { version: view.version, profileVersion: view.profileVersion, pattern: pattern() };
    expect((await post(body, "staff")).status).toBe(403);
    expect((await post(body, "manager", f.workspaceA2)).status).toBe(404);
    expect((await post(body, "outsider", f.workspaceA)).status).toBe(403);
    expect((await post({ ...body, tenantId: f.tenantB })).status).toBe(400);
    expect(
      (await post({ ...body, pattern: pattern({ effectiveFrom: "2026-11-06" }) })).status
    ).toBe(400);
    expect((await post({ ...body, profileVersion: 99 })).status).toBe(409);
    const response = await request(f.app.getHttpServer())
      .get(`/people/staff/${staffId}/availability`)
      .set("Authorization", "Bearer manager")
      .set("x-workspace-id", f.workspaceA);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(JSON.stringify(response.body)).not.toMatch(/personalEmail|notes|reason|bookedBy/);
  });
  it("publishes once on replay, rejects key reuse and competing versions", async () => {
    const view = await f.availability.detail(staffId, f.ctx);
    const body = { version: view.version, profileVersion: view.profileVersion, pattern: pattern() };
    const key = randomUUID();
    const before = await prisma.auditLog.count({
      where: { entityId: staffId, action: "people.availability.changed" },
    });
    expect((await post(body, "manager", undefined, key)).status).toBe(201);
    expect((await post(body, "manager", undefined, key)).status).toBe(201);
    expect(
      (await post({ ...body, pattern: pattern({ weeklyHours: [] }) }, "manager", undefined, key))
        .status
    ).toBe(409);
    expect((await post(body)).status).toBe(409);
    expect(
      await prisma.auditLog.count({
        where: { entityId: staffId, action: "people.availability.changed" },
      })
    ).toBe(before + 1);
    const current = await f.availability.detail(staffId, f.ctx);
    const attempts = await Promise.all([
      post({ ...body, version: current.version }),
      post({ ...body, version: current.version }),
    ]);
    expect(attempts.map((r) => r.status).sort()).toEqual([201, 409]);
  });
  it("flags live future commitments and preserves booking records and earlier patterns", async () => {
    const studio = (await openbuk.getStudio(f.ctx)).studio!;
    await openbuk.book(
      {
        serviceId: studio.serviceId,
        staffId: resourceId,
        startAt: "2026-11-09T09:00:00.000Z",
        customer: { name: "Synthetic visitor", email: "visitor@example.invalid" },
        consentAccepted: true,
      },
      randomUUID(),
      publicCtx()
    );
    const before = await prisma.booking.findMany({ where: { tenantId: f.tenantA } });
    const old = await f.schedules.get({ tenantId: f.tenantA, workspaceId: f.workspaceA }, staffId);
    const result = await save(pattern({ effectiveFrom: "2026-11-09", weeklyHours: [] }));
    expect(result.affectedCommitments).toEqual([
      expect.objectContaining({ id: before[0].id, kind: "booking" }),
    ]);
    expect(await prisma.booking.findMany({ where: { tenantId: f.tenantA } })).toEqual(before);
    expect(old.plans).not.toEqual(result.plans);
    await save(pattern({ effectiveFrom: "2026-11-16" }));
    expect((await f.availability.detail(staffId, f.ctx)).affectedCommitments).toHaveLength(1);
  });
  it("checks generic allocation, hold and reschedule writes inside the Booking transaction", async () => {
    const constraint = new BookingStaffConstraintAdapter(prisma, f.constraint);
    const repo = new PrismaBookingRepoAdapter(prisma, constraint);
    const start = new Date("2026-11-10T09:00:00Z"),
      end = new Date("2026-11-10T10:00:00Z");
    const id = randomUUID();
    const booking = new BookingEntity(
      id,
      f.tenantA,
      f.workspaceA,
      "CONFIRMED",
      start,
      end,
      `TEST-${id}`,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      f.manager,
      now,
      now,
      []
    );
    const allocation = new BookingAllocation(
      randomUUID(),
      f.tenantA,
      id,
      resourceId,
      "PRIMARY",
      start,
      end,
      now
    );
    await expect(repo.create(booking, [allocation])).rejects.toThrow("StaffUnavailable");
    const existing = await prisma.booking.findFirstOrThrow({ where: { tenantId: f.tenantA } });
    await expect(
      repo.replaceAllocations(existing.id, f.tenantA, [{ ...allocation, bookingId: existing.id }])
    ).rejects.toThrow("StaffUnavailable");
    const hold = new BookingHold(
      randomUUID(),
      f.tenantA,
      f.workspaceA,
      "ACTIVE",
      start,
      end,
      null,
      [resourceId],
      new Date("2026-11-10T11:00:00Z"),
      null,
      null,
      null,
      null,
      null,
      f.manager,
      now
    );
    await expect(new PrismaHoldRepoAdapter(prisma, constraint).create(hold)).rejects.toThrow(
      "StaffUnavailable"
    );
    expect(await prisma.bookingAllocation.count({ where: { bookingId: existing.id } })).toBe(1);
  });
  it("rolls back pattern, audit, event and replay together; retries the same key", async () => {
    const before = await f.availability.detail(staffId, f.ctx);
    const body = {
      version: before.version,
      profileVersion: before.profileVersion,
      pattern: pattern({ effectiveFrom: "2026-11-23" }),
    };
    const failing = new StaffAvailabilityUseCase(
      f.usecase,
      f.repo,
      f.schedules,
      f.booking,
      f.audit,
      {
        enqueue: async () => {
          throw new Error("synthetic outbox failure");
        },
      },
      clock,
      f.absences
    );
    const key = randomUUID();
    const audits = await prisma.auditLog.count({ where: { entityId: staffId } });
    await expect(failing.save(staffId, body, key, f.ctx)).rejects.toThrow("synthetic outbox");
    expect((await f.availability.detail(staffId, f.ctx)).version).toBe(before.version);
    expect(await prisma.auditLog.count({ where: { entityId: staffId } })).toBe(audits);
    expect((await f.availability.save(staffId, body, key, f.ctx)).version).toBe(before.version + 1);
  });
  it("serializes a pattern change against a public booking: reject or include the committed impact", async () => {
    await save(pattern({ effectiveFrom: "2026-11-30" }));
    const studio = (await openbuk.getStudio(f.ctx)).studio!;
    const results = await Promise.allSettled([
      save(pattern({ effectiveFrom: "2026-11-30", weeklyHours: [] })),
      openbuk.book(
        {
          serviceId: studio.serviceId,
          staffId: resourceId,
          startAt: "2026-11-30T09:00:00.000Z",
          customer: { name: "Race visitor", email: "race@example.invalid" },
          consentAccepted: true,
        },
        randomUUID(),
        publicCtx()
      ),
    ]);
    expect(results[0].status).toBe("fulfilled");
    const created = await prisma.booking.findFirst({
      where: { tenantId: f.tenantA, startAt: new Date("2026-11-30T09:00:00Z") },
    });
    if (results[1].status === "fulfilled")
      expect(
        (
          results[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof save>>>
        ).value.affectedCommitments.map((c) => c.id)
      ).toContain(created!.id);
    else {
      expect(created).toBeNull();
      expect(String(results[1].reason)).toContain("SlotUnavailable");
    }
  });
  it("keeps rejected holds active and consumes accepted holds atomically", async () => {
    await save(pattern({ effectiveFrom: "2026-12-07" }));
    const constraint = new BookingStaffConstraintAdapter(prisma, f.constraint);
    const holds = new PrismaHoldRepoAdapter(prisma, constraint);
    const hold = new BookingHold(
      randomUUID(),
      f.tenantA,
      f.workspaceA,
      "ACTIVE",
      new Date("2026-12-07T09:00:00Z"),
      new Date("2026-12-07T10:00:00Z"),
      null,
      [resourceId],
      new Date("2030-01-01T00:00:00Z"),
      null,
      null,
      null,
      null,
      null,
      f.manager,
      now
    );
    await holds.create(hold);
    const closed = await save(pattern({ effectiveFrom: "2026-12-07", weeklyHours: [] }));
    expect(closed.affectedCommitments).toContainEqual(
      expect.objectContaining({ id: hold.id, kind: "hold" })
    );
    const create = new CreateBookingUseCase(
      new PrismaBookingRepoAdapter(prisma, constraint),
      holds,
      new PrismaResourceRepoAdapter(prisma),
      f.audit,
      f.outbox,
      { get: async () => null, store: async () => undefined },
      { newId: randomUUID },
      clock,
      f.absences
    );
    await expect(create.execute({ holdId: hold.id }, f.ctx)).rejects.toThrow("StaffUnavailable");
    expect((await holds.findById(hold.id, f.tenantA))?.status).toBe("ACTIVE");
    expect(await prisma.booking.count({ where: { holdId: hold.id } })).toBe(0);
    await save(pattern({ effectiveFrom: "2026-12-07" }));
    const booking = await create.execute({ holdId: hold.id }, f.ctx);
    expect((await holds.findById(hold.id, f.tenantA))?.confirmedBookingId).toBe(booking.id);
    await expect(create.execute({ holdId: hold.id }, f.ctx)).rejects.toThrow("no longer active");
  });
});
