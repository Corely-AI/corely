import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaService,
  PrismaUnitOfWork,
} from "@corely/data";
import type { AuditPort, UseCaseContext } from "@corely/kernel";
import { PrismaIdempotencyStorageAdapter } from "../../../shared/infrastructure/persistence/prisma-idempotency-storage.adapter";
import { StaffAvailabilityConstraintService } from "../../people/public";
import { ExtStaffAbsenceAdapter } from "../../people/infrastructure/ext-staff-absence.adapter";
import { ExtStaffAvailabilityAdapter } from "../../people/infrastructure/ext-staff-availability.adapter";
import { ExtStaffRepositoryAdapter } from "../../people/infrastructure/ext-staff-repository.adapter";
import { CreateHoldUseCase } from "../application/use-cases/create-hold.usecase";
import { GetAvailabilityUseCase } from "../application/use-cases/get-availability.usecase";
import { UpsertAvailabilityRuleUseCase } from "../application/use-cases/upsert-availability-rule.usecase";
import { BookingStaffConstraintAdapter } from "../infrastructure/adapters/booking-staff-constraint.adapter";
import { PrismaAvailabilityRuleRepoAdapter } from "../infrastructure/adapters/prisma-availability-rule-repo.adapter";
import { PrismaBookingRepoAdapter } from "../infrastructure/adapters/prisma-booking-repo.adapter";
import { PrismaHoldRepoAdapter } from "../infrastructure/adapters/prisma-hold-repo.adapter";
import { PrismaResourceRepoAdapter } from "../infrastructure/adapters/prisma-resource-repo.adapter";

const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Booking scheduling consistency", () => {
  const tenantId = randomUUID();
  const workspaceId = randomUUID();
  const resourceId = randomUUID();
  const context: UseCaseContext = { tenantId, workspaceId, userId: "test-manager" };
  const clock = { now: () => new Date() };
  const idGenerator = { newId: randomUUID };
  let prisma: PrismaService;
  let createHold: CreateHoldUseCase;
  let idempotency: PrismaIdempotencyStorageAdapter;
  let ruleRepo: PrismaAvailabilityRuleRepoAdapter;
  let resourceRepo: PrismaResourceRepoAdapter;

  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    const kv = new PrismaExtKvAdapter(prisma);
    const people = new StaffAvailabilityConstraintService(
      new ExtStaffRepositoryAdapter(prisma, kv),
      new ExtStaffAvailabilityAdapter(kv),
      new ExtStaffAbsenceAdapter(prisma, kv)
    );
    const staff = new BookingStaffConstraintAdapter(prisma, people);
    resourceRepo = new PrismaResourceRepoAdapter(prisma);
    ruleRepo = new PrismaAvailabilityRuleRepoAdapter(prisma);
    idempotency = new PrismaIdempotencyStorageAdapter(prisma);
    createHold = new CreateHoldUseCase(
      new PrismaHoldRepoAdapter(prisma, staff),
      new PrismaBookingRepoAdapter(prisma, staff),
      idempotency,
      idGenerator,
      clock,
      new PrismaUnitOfWork(prisma)
    );
    await prisma.bookingResource.create({
      data: {
        id: resourceId,
        tenantId,
        workspaceId,
        name: "Test resource",
        type: "STAFF",
        tags: [],
      },
    });
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    await prisma.bookingHold.deleteMany({ where: { tenantId } });
    await prisma.bookingAvailabilityRule.deleteMany({ where: { tenantId } });
    await prisma.bookingResource.deleteMany({ where: { tenantId } });
    await prisma.idempotencyKey.deleteMany({ where: { tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.onModuleDestroy();
  });

  function holdInput() {
    const startAt = new Date(Date.now() + 86_400_000);
    return {
      startAt,
      endAt: new Date(startAt.getTime() + 3_600_000),
      resourceIds: [resourceId],
      idempotencyKey: randomUUID(),
    };
  }

  it("returns one hold for concurrent retries and rejects changes under the same key", async () => {
    const input = holdInput();
    const [a, b] = await Promise.all([
      createHold.execute(input, context),
      createHold.execute(input, context),
    ]);
    expect(b.id).toBe(a.id);
    expect(b.expiresAt).toEqual(a.expiresAt);
    await expect(createHold.execute({ ...input, ttlSeconds: 900 }, context)).rejects.toThrow(
      "Booking:IdempotencyMismatch"
    );
    expect(await prisma.bookingHold.count({ where: { tenantId } })).toBe(1);
  });

  it("rolls back a hold when its replay receipt fails", async () => {
    const input = holdInput();
    input.startAt = new Date(input.startAt.getTime() + 86_400_000);
    input.endAt = new Date(input.endAt.getTime() + 86_400_000);
    const store = vi
      .spyOn(idempotency, "store")
      .mockRejectedValueOnce(new Error("Storage unavailable"));
    try {
      await expect(createHold.execute(input, context)).rejects.toThrow("Storage unavailable");
      expect(await prisma.bookingHold.count({ where: { tenantId, startAt: input.startAt } })).toBe(
        0
      );
    } finally {
      store.mockRestore();
    }
    expect((await createHold.execute(input, context)).status).toBe("ACTIVE");
  });

  it("replays existing receipts only within the original workspace", async () => {
    const input = holdInput();
    input.startAt = new Date(input.startAt.getTime() + 172_800_000);
    input.endAt = new Date(input.endAt.getTime() + 172_800_000);
    const original = await createHold.execute({ ...input, idempotencyKey: undefined }, context);
    await idempotency.store("booking.hold.create", tenantId, input.idempotencyKey, {
      body: original,
    });
    expect((await createHold.execute(input, context)).id).toBe(original.id);
    await expect(
      createHold.execute(input, { ...context, workspaceId: randomUUID() })
    ).rejects.toThrow("Resource is unavailable in this workspace");
  });

  const rule = {
    resourceId,
    timezone: "Europe/Berlin",
    weeklySlots: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
    blackouts: [],
  };

  function upsertRule(audit: AuditPort) {
    return new UpsertAvailabilityRuleUseCase(
      ruleRepo,
      resourceRepo,
      audit,
      clock,
      idGenerator,
      new PrismaUnitOfWork(prisma)
    );
  }

  it("keeps a rule edit under the booking resource lock through its audit write", async () => {
    let entered = () => {};
    let release = () => {};
    const auditing = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writing = upsertRule({
      log: async () => {
        entered();
        await gate;
      },
    }).execute(rule, context);
    await auditing;
    let available: boolean | undefined;
    try {
      [{ available }] = await prisma.$queryRaw<{ available: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(hashtextextended(${`${tenantId}:${resourceId}`}, 0)) AS available
      `;
    } finally {
      release();
      await writing;
    }
    expect(available).toBe(false);
  });

  it("rolls back a rule change when its audit write fails", async () => {
    await upsertRule(new PrismaAuditAdapter(prisma)).execute(rule, context);
    const failed = upsertRule({
      log: async () => {
        throw new Error("Audit unavailable");
      },
    });
    await expect(failed.execute({ ...rule, timezone: "UTC" }, context)).rejects.toThrow(
      "Audit unavailable"
    );
    expect((await ruleRepo.findByResourceId(resourceId, tenantId))?.timezone).toBe(rule.timezone);
  });

  it("hides rules from other workspaces and preserves blackout intervals", async () => {
    const startAt = new Date("2026-12-14T10:00:00Z");
    const endAt = new Date("2026-12-14T11:00:00Z");
    const input = { ...rule, blackouts: [{ startAt, endAt }] };
    const upsert = upsertRule(new PrismaAuditAdapter(prisma));
    await upsert.execute(input, context);
    const otherWorkspace = { ...context, workspaceId: randomUUID() };
    await expect(upsert.execute(input, otherWorkspace)).rejects.toThrow("not found");
    const get = new GetAvailabilityUseCase(ruleRepo, resourceRepo);
    const query = { resourceId, from: startAt, to: endAt };
    expect((await get.execute(query, otherWorkspace)).rule).toBeNull();
    expect((await get.execute(query, context)).rule?.blackouts).toEqual(input.blackouts);
  });
});
