import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaExtKvAdapter, PrismaService } from "@corely/data";
import { PrismaResourceRepoAdapter } from "../infrastructure/adapters/prisma-resource-repo.adapter";
import { PrismaServiceRepoAdapter } from "../infrastructure/adapters/prisma-service-repo.adapter";
import { LegacyPublicBookingAvailabilityUseCase } from "../application/use-cases/legacy-public-booking-availability.usecase";
import type {
  AvailabilityRuleRepositoryPort,
  BookingRepositoryPort,
  HoldRepositoryPort,
} from "../application/ports/booking-repo.ports";

const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url);

describe.skipIf(!enabled)("Public Booking isolation and shared limits", () => {
  const tenantId = randomUUID();
  const workspaceId = randomUUID();
  const otherWorkspace = randomUUID();
  let prisma: PrismaService;
  let second: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    second = new PrismaService();
    await Promise.all([prisma.$connect(), second.$connect()]);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.extKv.deleteMany({ where: { tenantId } });
      await prisma.bookingServiceOffering.deleteMany({ where: { tenantId } });
      await prisma.bookingResource.deleteMany({ where: { tenantId } });
      await prisma.onModuleDestroy();
    }
    if (second) await second.onModuleDestroy();
  });

  it("shares one fixed-window allowance between independent PostgreSQL connections", async () => {
    const firstCounter = new PrismaExtKvAdapter(prisma);
    const secondCounter = new PrismaExtKvAdapter(second);
    const key = { tenantId, moduleId: "booking", scope: "synthetic-rate", key: randomUUID() };
    const attempts = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        (index % 2 ? secondCounter : firstCounter).claimFixedWindow(key, 3, 3_600_000)
      )
    );
    expect(attempts.filter(Boolean)).toHaveLength(3);
    expect(await secondCounter.claimFixedWindow(key, 3, 3_600_000)).toBe(false);
    const record = await firstCounter.get(key);
    expect(record?.value).toMatchObject({ count: 3 });
    await firstCounter.set({ ...key, value: { window: 0, count: 3 } });
    expect(await secondCounter.claimFixedWindow(key, 3, 3_600_000)).toBe(true);
    expect((await firstCounter.get(key))?.value).toMatchObject({ count: 1 });
  });

  it("limits legacy public catalog matching to the resolved workspace and tenant-wide offerings", async () => {
    const own = randomUUID();
    const foreign = randomUUID();
    const shared = randomUUID();
    await prisma.bookingServiceOffering.createMany({
      data: [
        { id: own, workspaceId },
        { id: foreign, workspaceId: otherWorkspace },
        { id: shared, workspaceId: null },
      ].map((item) => ({
        ...item,
        tenantId,
        name: item.id,
        durationMinutes: 30,
        requiredResourceTypes: [],
        requiredTags: [],
      })),
    });
    const foreignStaff = randomUUID();
    await prisma.bookingResource.create({
      data: {
        id: foreignStaff,
        workspaceId: otherWorkspace,
        tenantId,
        type: "STAFF",
        name: "Other studio",
        tags: [],
      },
    });
    const services = new PrismaServiceRepoAdapter(prisma);
    const resources = new PrismaResourceRepoAdapter(prisma);
    const availability = new LegacyPublicBookingAvailabilityUseCase(
      services,
      resources,
      {} as AvailabilityRuleRepositoryPort,
      {} as BookingRepositoryPort,
      {} as HoldRepositoryPort
    );
    const scope = { tenantId, workspaceId };
    const selected = await availability.publicService(scope, own);
    await expect(availability.publicService(scope, foreign)).rejects.toThrow("Service not found");
    await expect(availability.publicService(scope, shared)).resolves.toMatchObject({ id: shared });
    expect(
      (await services.findMany(tenantId, { workspaceId }, 1, 200)).items.map(({ id }) => id).sort()
    ).toEqual([own, shared].sort());
    await expect(
      availability.resolveResourceForSelection({
        ...scope,
        service: selected,
        staffId: foreignStaff,
        startAt: new Date(0),
        endAt: new Date(3_600_000),
      })
    ).resolves.toBeNull();
  });
});
