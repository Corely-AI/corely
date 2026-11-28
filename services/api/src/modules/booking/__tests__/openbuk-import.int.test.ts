import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import {
  PrismaService,
  PrismaUnitOfWork,
  PrismaAuditAdapter,
  PrismaOutboxAdapter,
  PrismaExtKvAdapter,
} from "@corely/data";
import type {
  OpenBukImportConfirmedRow,
  OpenBukImportInput,
  OpenBukStudio,
} from "@corely/contracts";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import { AssociateInvitedAccountUseCase } from "../../identity/public";
import { AuthorizeWorkspaceUseCase, PilotSetupUseCase } from "../../workspaces/public";
import { GetWorkspaceUseCase } from "../../workspaces/application/use-cases/get-workspace.usecase";
import { PrismaPilotSetupRepository } from "../../workspaces/infrastructure/adapters/prisma-pilot-setup-repository.adapter";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { OpenBukImportUseCase } from "../application/use-cases/openbuk-import.usecase";
import { OpenBukStudioUseCase } from "../application/use-cases/openbuk-studio.usecase";
import { OpenBukImportLedgerAdapter } from "../infrastructure/adapters/openbuk-import-ledger.adapter";
import { PrismaOpenBukRepositoryAdapter } from "../infrastructure/adapters/prisma-openbuk-repository.adapter";
import { studioFixture } from "./openbuk-fixtures";

const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled =
  !!url && /^postgresql:\/\/[^/]*@127\.0\.0\.1:\d+\/openbuk_test_import_[a-z0-9_]+$/.test(url);
const tenantId = randomUUID();
const workspaceId = randomUUID();
const userId = randomUUID();
const slug = "import-" + workspaceId;
const scope = { tenantId, workspaceId };
const ctx: UseCaseContext = { ...scope, userId };
const clock = { now: () => new Date("2026-10-01T00:00:00Z") };

describe.skipIf(!enabled)("Private OpenBuk booking import", () => {
  let prisma: PrismaService;
  let studio: OpenBukStudio;
  let importer: OpenBukImportUseCase;
  let makeImporter: (outbox: OutboxPort) => OpenBukImportUseCase;
  const guest = { name: "Synthetic Guest", email: "synthetic-private@example.invalid" };
  const confirmed = (
    sourceId: string,
    overrides: Partial<OpenBukImportConfirmedRow> = {}
  ): OpenBukImportConfirmedRow => ({
    sourceId,
    status: "CONFIRMED",
    sourceServiceId: "legacy-service",
    sourceStaffId: "legacy-staff",
    startAt: "2026-10-05T09:00:00+02:00",
    endAt: "2026-10-05T09:45:00+02:00",
    priceCents: 4200,
    currency: "EUR",
    customer: guest,
    ...overrides,
  });
  const batch = (...rows: unknown[]): OpenBukImportInput => ({
    source: "previous-studio",
    exportedAt: "2026-10-01T07:00:00Z",
    exportHash: "a".repeat(64),
    timezone: "Europe/Berlin",
    staff: { "legacy-staff": studio.staffId },
    services: { "legacy-service": studio.serviceId },
    rows,
  });
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.tenant.create({ data: { id: tenantId, name: "Import fixture", slug } });
    await prisma.user.create({
      data: {
        id: userId,
        email: userId + "@example.invalid",
        name: "Manager",
        passwordHash: "synthetic",
      },
    });
    const legal = await prisma.legalEntity.create({
      data: {
        tenantId,
        legalName: "Import fixture",
        kind: "COMPANY",
        countryCode: "DE",
        currency: "EUR",
      },
    });
    await prisma.workspace.create({
      data: {
        tenantId,
        id: workspaceId,
        name: "Import fixture",
        slug,
        legalEntityId: legal.id,
        memberships: { create: { userId, role: "OWNER", status: "ACTIVE" } },
      },
    });
    const auth = new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(prisma));
    const kv = new PrismaExtKvAdapter(prisma);
    const ledger = new OpenBukImportLedgerAdapter(kv);
    const repo = new PrismaOpenBukRepositoryAdapter(prisma, kv);
    const uow = new PrismaUnitOfWork(prisma);
    const audit = new PrismaAuditAdapter(prisma);
    const outbox = new PrismaOutboxAdapter(prisma);
    const pilot = new PilotSetupUseCase(
      new PrismaPilotSetupRepository(prisma),
      uow,
      audit,
      outbox,
      clock,
      auth,
      mock<GetWorkspaceUseCase>(),
      mock<AssociateInvitedAccountUseCase>()
    );
    const scheduling = new OpenBukStudioUseCase(repo, uow, audit, outbox, clock, auth, pilot, {
      windows: async () => null,
    });
    const { serviceId, staffId, slug: testSlug, ...setup } = studioFixture();
    ({ studio } = await scheduling.configure(setup, ctx));
    makeImporter = (sink) =>
      new OpenBukImportUseCase(repo, ledger, uow, clock, audit, sink, [], scheduling, auth, pilot);
    importer = makeImporter(outbox);
  }, 30_000);

  afterAll(async () => {
    if (!prisma) return;
    await prisma.bookingAllocation.deleteMany({ where: { tenantId } });
    await prisma.booking.deleteMany({ where: { tenantId } });
    await prisma.bookingAvailabilityRule.deleteMany({ where: { tenantId } });
    await prisma.bookingResource.deleteMany({ where: { tenantId } });
    await prisma.bookingServiceOffering.deleteMany({ where: { tenantId } });
    await prisma.extKv.deleteMany({ where: { tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.onModuleDestroy();
  });

  it("previews rows under the current workspace, with explicit mapping, offsets, and buffer conflicts", async () => {
    const input = batch(
      confirmed("earliest"),
      confirmed("earliest"),
      confirmed("overlap", {
        startAt: "2026-10-05T09:45:00+02:00",
        endAt: "2026-10-05T10:30:00+02:00",
      }),
      confirmed("wrong-zone", { startAt: "2026-10-05T09:00:00+01:00" }),
      confirmed("wrong-staff", { sourceStaffId: "other-staff" }),
      { sourceId: "bad" }
    );
    const result = await importer.preview(input, ctx);
    expect(result).toMatchObject({
      applied: false,
      rows: [
        {
          status: "READY",
          appointment: {
            staffId: studio.staffId,
            priceCents: 4200,
            startAt: "2026-10-05T07:00:00.000Z",
          },
        },
        { status: "ERROR", error: "DUPLICATE_SOURCE" },
        { status: "ERROR", error: "BATCH_OVERLAP" },
        { status: "ERROR", error: "TIMEZONE_MISMATCH" },
        { status: "ERROR", error: "MISSING_MAPPING" },
        { status: "ERROR", error: "INVALID_ROW" },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(guest.email);
    expect(
      await importer.apply({ batch: input, preview: result.preview, sourceWritesFrozen: true }, ctx)
    ).toMatchObject({ applied: false });
    expect(await prisma.booking.count({ where: scope })).toBe(0);
    await expect(
      importer.preview(input, { ...ctx, workspaceId: randomUUID() })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("applies an exact batch once and leaves changed rows and public workspaces blocked", async () => {
    const input = batch(confirmed("same-booking"), { sourceId: "cancelled", status: "CANCELLED" });
    const preview = await importer.preview(input, ctx);
    const approval = { batch: input, preview: preview.preview, sourceWritesFrozen: true };
    const [first, repeated] = await Promise.all([
      importer.apply(approval, ctx),
      importer.apply(approval, ctx),
    ]);
    expect(first).toEqual(repeated);
    expect(first).toMatchObject({
      applied: true,
      rows: [
        { status: "IMPORTED", bookingId: expect.any(String) },
        { status: "IMPORTED", bookingId: null },
      ],
    });
    const booking = await prisma.booking.findFirstOrThrow({
      where: scope,
      include: { allocations: true },
    });
    expect(booking).toMatchObject({
      serviceOfferingId: studio.serviceId,
      allocations: [{ resourceId: studio.staffId }],
    });
    expect(await prisma.booking.count({ where: scope })).toBe(1);
    const logs = await prisma.outboxEvent.findMany({
      where: { tenantId, eventType: "booking.created" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].payloadJson).toContain("openbuk-import");
    expect(logs[0].payloadJson).not.toContain(guest.email);
    expect(await prisma.auditLog.count({ where: { tenantId, action: "booking.imported" } })).toBe(
      2
    );
    const changed = batch(confirmed("same-booking", { priceCents: 9999 }));
    await expect(importer.apply({ ...approval, batch: changed }, ctx)).rejects.toMatchObject({
      status: 409,
    });
    expect((await importer.preview(changed, ctx)).rows[0]).toMatchObject({
      status: "ERROR",
      error: "CHANGED_SOURCE",
    });

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { publicEnabled: true, publicModules: { booking: true } },
    });
    try {
      await expect(importer.preview(input, ctx)).rejects.toMatchObject({ status: 409 });
    } finally {
      await prisma.workspace.update({ where: { id: workspaceId }, data: { publicEnabled: false } });
    }
  });

  it("rolls the row, receipt and audit back if the transactional event write fails", async () => {
    const input = batch(
      confirmed("failed-new", {
        startAt: "2026-10-12T09:00:00+02:00",
        endAt: "2026-10-12T09:45:00+02:00",
      })
    );
    const step = await importer.preview(input, ctx);
    const failing = makeImporter({
      enqueue: async () => {
        throw new Error("synthetic event failure");
      },
    });
    await expect(
      failing.apply({ batch: input, preview: step.preview, sourceWritesFrozen: true }, ctx)
    ).rejects.toThrow("synthetic event failure");
    expect(await importer.preview(input, ctx)).toMatchObject({ rows: [{ status: "READY" }] });
    expect(await prisma.auditLog.count({ where: { tenantId, action: "booking.imported" } })).toBe(
      2
    );
  });
});
