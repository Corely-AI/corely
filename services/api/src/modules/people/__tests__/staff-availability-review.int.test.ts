import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaService } from "@corely/data";
import type { StaffPattern } from "@corely/contracts";
import { staffFixture } from "./staff-fixture";
import {
  BookingEntity,
  BookingAllocation,
  BookingHold,
} from "../../booking/domain/booking.entities";
import { BookingStaffConstraintAdapter } from "../../booking/infrastructure/adapters/booking-staff-constraint.adapter";
import { PrismaBookingRepoAdapter } from "../../booking/infrastructure/adapters/prisma-booking-repo.adapter";
import { PrismaHoldRepoAdapter } from "../../booking/infrastructure/adapters/prisma-hold-repo.adapter";

const url = process.env.PEOPLE_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/people_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Availability review regressions", () => {
  let prisma: PrismaService;
  let f: Awaited<ReturnType<typeof staffFixture>>;
  let now: Date;
  let staffId: string;
  const pattern = (weeklyHours: StaffPattern["weeklyHours"]): StaffPattern => ({
    timezone: "Europe/Berlin",
    effectiveFrom: "2026-11-09",
    effectiveUntil: null,
    weeklyHours,
    exceptions: [],
  });
  const save = async (p: StaffPattern) => {
    const current = await f.availability.detail(staffId, f.ctx);
    return f.availability.save(
      staffId,
      { version: current.version, profileVersion: current.profileVersion, pattern: p },
      randomUUID(),
      f.ctx
    );
  };
  beforeEach(async () => {
    process.env.DATABASE_URL = url!;
    now = new Date("2026-11-07T12:00:00Z");
    prisma = new PrismaService();
    await prisma.$connect();
    f = await staffFixture(prisma, { now: () => now });
    staffId = (
      await f.usecase.command(
        "create",
        null,
        { displayName: "Review fixture", resourceId: f.resource.id },
        randomUUID(),
        f.ctx
      )
    ).id;
    await save(pattern([{ dayOfWeek: 1, startTime: "09:00", endTime: "14:00" }]));
  });
  afterEach(async () => {
    await f?.cleanup();
    await prisma?.onModuleDestroy();
  });
  async function booking(
    start: string,
    end: string,
    bufferStart = start,
    resourceId = f.resource.id
  ) {
    const id = randomUUID();
    const entity = new BookingEntity(
      id,
      f.tenantA,
      f.workspaceA,
      "CONFIRMED",
      new Date(start),
      new Date(end),
      `R-${id}`,
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
      new Date(bufferStart),
      new Date(end),
      now
    );
    await new PrismaBookingRepoAdapter(
      prisma,
      new BookingStaffConstraintAdapter(prisma, f.constraint)
    ).create(entity, [allocation]);
    return id;
  }
  it("flags an upcoming booking whose preparation buffer already started, without flagging ended bookings", async () => {
    const ended = await booking("2026-11-09T08:00:00Z", "2026-11-09T08:30:00Z");
    const upcoming = await booking(
      "2026-11-09T09:00:00Z",
      "2026-11-09T09:45:00Z",
      "2026-11-09T08:45:00Z"
    );
    const before = await prisma.booking.findMany({ where: { tenantId: f.tenantA } });
    now = new Date("2026-11-09T08:55:00Z");
    const result = await save(pattern([]));
    expect(result.affectedCommitments.map((c) => c.id)).toContain(upcoming);
    expect(result.affectedCommitments.map((c) => c.id)).not.toContain(ended);
    expect(await prisma.booking.findMany({ where: { tenantId: f.tenantA } })).toEqual(before);
  });
  it("flags the remaining portion of an unexpired hold that already started", async () => {
    const hold = new BookingHold(
      randomUUID(),
      f.tenantA,
      f.workspaceA,
      "ACTIVE",
      new Date("2026-11-09T08:45:00Z"),
      new Date("2026-11-09T09:45:00Z"),
      null,
      [f.resource.id],
      new Date("2030-01-01T00:00:00Z"),
      null,
      null,
      null,
      null,
      null,
      f.manager,
      now
    );
    const holds = new PrismaHoldRepoAdapter(
      prisma,
      new BookingStaffConstraintAdapter(prisma, f.constraint)
    );
    await holds.create(hold);
    now = new Date("2026-11-09T08:55:00Z");
    const result = await save(pattern([]));
    expect(result.affectedCommitments).toContainEqual(
      expect.objectContaining({ id: hold.id, kind: "hold" })
    );
    expect((await holds.findById(hold.id, f.tenantA))?.status).toBe("ACTIVE");
  });
  it("ignores elapsed availability when a pattern is first published during a legacy booking", async () => {
    const resource = await prisma.bookingResource.create({
      data: {
        tenantId: f.tenantA,
        workspaceId: f.workspaceA,
        type: "STAFF",
        name: "Legacy resource",
        tags: [],
      },
    });
    await booking(
      "2026-11-09T08:45:00Z",
      "2026-11-09T09:45:00Z",
      "2026-11-09T08:45:00Z",
      resource.id
    );
    now = new Date("2026-11-09T08:55:00Z");
    staffId = (
      await f.usecase.command(
        "create",
        null,
        { displayName: "New link", resourceId: resource.id },
        randomUUID(),
        f.ctx
      )
    ).id;
    const result = await save(pattern([{ dayOfWeek: 1, startTime: "09:00", endTime: "14:00" }]));
    expect(result.affectedCommitments).toEqual([]);
  });
});
