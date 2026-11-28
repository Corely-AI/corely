import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaService,
  PrismaUnitOfWork,
} from "@corely/data";
import type { OpenBukTeamUpdate } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import { OpenBukStudioUseCase } from "../application/use-cases/openbuk-studio.usecase";
import { PrismaOpenBukRepositoryAdapter } from "../infrastructure/adapters/prisma-openbuk-repository.adapter";
import { studioFixture } from "./openbuk-fixtures";

const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("OpenBuk team booking", () => {
  let prisma: PrismaService;
  let repo: PrismaOpenBukRepositoryAdapter;
  let app: OpenBukStudioUseCase;
  const tenantId = randomUUID();
  const scope = { tenantId, workspaceId: randomUUID() };
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
  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    repo = new PrismaOpenBukRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma));
    app = new OpenBukStudioUseCase(
      repo,
      new PrismaUnitOfWork(prisma),
      new PrismaAuditAdapter(prisma),
      new PrismaOutboxAdapter(prisma),
      { now: () => new Date("2026-10-01T00:00:00.000Z") },
      { execute: async () => ({ slug: "test-studio", name: "Studio" }) },
      { publish: async () => {} },
      { windows: async () => null }
    );
    const { serviceId: _serviceId, staffId: _staffId, slug: _slug, ...setup } = studioFixture();
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

  it("books only configured team pairs and keeps commitments and receipts after archiving", async () => {
    const teamContext = { ...ctx, workspaceId: randomUUID() };
    const { serviceId: _serviceId, staffId: _staffId, slug: _slug, ...setup } = studioFixture();
    const { studio } = await app.configure(setup, teamContext);
    const secondaryStaff = randomUUID();
    const secondaryService = randomUUID();
    const draft: OpenBukTeamUpdate = {
      revision: null,
      updateId: randomUUID(),
      staff: [
        { id: studio.staffId, staffName: studio.staffName, active: true },
        { id: secondaryStaff, staffName: "Sofia", active: true, create: true },
      ],
      services: [
        {
          id: studio.serviceId,
          serviceName: studio.serviceName,
          active: true,
          staffIds: [studio.staffId],
          durationMinutes: 45,
          priceCents: 3500,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 15,
        },
        {
          id: secondaryService,
          serviceName: "Consultation",
          active: true,
          create: true,
          staffIds: [secondaryStaff],
          durationMinutes: 30,
          priceCents: 2000,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 15,
        },
      ],
    };
    const outsider = await repo.studio(scope);
    if (!outsider) {
      throw new Error("Missing foreign-workspace fixture");
    }
    await expect(
      app.saveTeam(
        {
          ...draft,
          staff: [draft.staff[0], { id: outsider.staffId, staffName: "Outside", active: true }],
          services: [draft.services[0], { ...draft.services[1], staffIds: [outsider.staffId] }],
        },
        teamContext
      )
    ).rejects.toThrow("Select booking records from this studio");
    const saved = await app.saveTeam(draft, teamContext);
    expect(await app.saveTeam(draft, teamContext)).toEqual(saved);
    await expect(app.saveTeam({ ...draft, updateId: randomUUID() }, teamContext)).rejects.toThrow(
      "Booking:TeamChanged"
    );
    expect(
      (await app.publicStudio(teamContext)).studio.services?.map(({ serviceId, staff }) => ({
        serviceId,
        staffIds: staff.map(({ staffId }) => staffId),
      }))
    ).toEqual([
      { serviceId: studio.serviceId, staffIds: [studio.staffId] },
      { serviceId: secondaryService, staffIds: [secondaryStaff] },
    ]);
    const body = {
      startAt: "2026-10-05T08:00:00Z",
      customer: { name: "Test guest", email: "guest@example.test" },
      consentAccepted: true as const,
      serviceId: secondaryService,
      staffId: secondaryStaff,
    };
    await expect(
      app.book({ ...body, staffId: studio.staffId }, randomUUID(), teamContext)
    ).rejects.toThrow("Booking:ServiceUnavailable");
    const availability = await app.availability("2026-10-05", teamContext, body);
    expect(availability.slots).toContainEqual({
      startAt: body.startAt.replace("Z", ".000Z"),
      endAt: "2026-10-05T08:30:00.000Z",
    });
    const key = randomUUID();
    const result = await app.book(body, key, teamContext);
    expect(result.receipt).toMatchObject({
      serviceName: "Consultation",
      staffName: "Sofia",
      priceCents: 2000,
    });
    const archive = await app.saveTeam(
      {
        revision: saved.team.revision,
        updateId: randomUUID(),
        staff: saved.team.staff.map(({ futureCommitments: _, ...member }) =>
          member.id === secondaryStaff
            ? { ...member, staffName: "Sofia Peters", active: false }
            : member
        ),
        services: saved.team.services.map(({ futureCommitments: _, ...service }) =>
          service.id === secondaryService
            ? { ...service, serviceName: "New consultation", priceCents: 4000, active: false }
            : service
        ),
      },
      teamContext
    );
    expect(archive.team.services[1]).toMatchObject({ active: false, futureCommitments: 1 });
    expect(archive.team.staff[1]).toMatchObject({ active: false, futureCommitments: 1 });
    expect((await app.publicStudio(teamContext)).studio.services).toHaveLength(1);
    await expect(app.book(body, randomUUID(), teamContext)).rejects.toThrow(
      "Booking:ServiceUnavailable"
    );
    expect(await app.book(body, key, teamContext)).toEqual(result);
    expect((await app.appointments("2026-10-05", teamContext)).appointments[0]).toMatchObject({
      reference: result.receipt.reference,
      serviceName: "Consultation",
      staffName: "Sofia",
      priceCents: 2000,
    });
  });
});
