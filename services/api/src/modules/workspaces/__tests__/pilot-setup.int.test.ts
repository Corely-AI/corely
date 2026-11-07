import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  PrismaService,
  PrismaUnitOfWork,
  PrismaAuditAdapter,
  PrismaOutboxAdapter,
  PrismaExtKvAdapter,
} from "@corely/data";
import type {
  OutboxPort,
  UseCaseContext,
  UnitOfWorkPort,
  TransactionContext,
} from "@corely/kernel";
import { OpenBukSetupDraftSchema } from "@corely/contracts";
import { PrismaUserRepository } from "../../identity/infrastructure/adapters/prisma-user-repository.adapter";
import { PrismaInvitedAccountAdapter } from "../../identity/infrastructure/adapters/prisma-invited-account.adapter";
import { AssociateInvitedAccountUseCase } from "../../identity/application/use-cases/associate-invited-account.usecase";
import { PrismaWorkspaceRepository } from "../infrastructure/adapters/prisma-workspace-repository.adapter";
import { PrismaPilotSetupRepository } from "../infrastructure/adapters/prisma-pilot-setup-repository.adapter";
import { AuthorizeWorkspaceUseCase } from "../application/use-cases/authorize-workspace.usecase";
import { GetWorkspaceUseCase } from "../application/use-cases/get-workspace.usecase";
import { UpdateWorkspaceUseCase } from "../application/use-cases/update-workspace.usecase";
import { PilotSetupUseCase } from "../application/use-cases/pilot-setup.usecase";
import { OpenBukStudioUseCase } from "../../booking/application/use-cases/openbuk-studio.usecase";
import { PrismaOpenBukRepositoryAdapter } from "../../booking/infrastructure/adapters/prisma-openbuk-repository.adapter";
import { studioFixture } from "../../booking/__tests__/openbuk-fixtures";

const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Pilot setup PostgreSQL boundaries", () => {
  let prisma: PrismaService;
  let app: PilotSetupUseCase;
  let booking: OpenBukStudioUseCase;
  let workspaceId: string;
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const owner = randomUUID();
  const staff = randomUUID();
  const outsider = randomUUID();
  const rollbackStaff = randomUUID();
  const rollbackOwner = randomUUID();
  const ctx: UseCaseContext = { tenantId, userId: owner };
  const staffCtx: UseCaseContext = { tenantId: otherTenantId, userId: staff };
  const email = `${staff}@example.test`;
  const now = new Date("2026-11-07T12:00:00Z");
  const input = { name: `Pilot ${tenantId}`, countryCode: "DE", currency: "EUR" };
  function build(
    outbox: OutboxPort = new PrismaOutboxAdapter(prisma),
    uow: UnitOfWorkPort = new PrismaUnitOfWork(prisma)
  ) {
    const repo = new PrismaWorkspaceRepository(prisma);
    const audit = new PrismaAuditAdapter(prisma);
    return new PilotSetupUseCase(
      new PrismaPilotSetupRepository(prisma),
      uow,
      audit,
      outbox,
      { now: () => now },
      new AuthorizeWorkspaceUseCase(repo),
      new GetWorkspaceUseCase(repo),
      new AssociateInvitedAccountUseCase(
        new PrismaUserRepository(prisma),
        new PrismaInvitedAccountAdapter(prisma),
        audit,
        outbox
      )
    );
  }
  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    for (const id of [tenantId, otherTenantId]) {
      await prisma.tenant.create({ data: { id, name: `Pilot ${id}`, slug: `pilot-${id}` } });
      await prisma.role.create({
        data: { tenantId: id, name: "Staff", systemKey: "STAFF", isSystem: true },
      });
    }
    for (const id of [owner, staff, outsider, rollbackStaff, rollbackOwner]) {
      await prisma.user.create({
        data: { id, email: `${id}@example.test`, passwordHash: "unused", status: "ACTIVE" },
      });
    }
    app = build();
    workspaceId = (await app.start(input, ctx)).workspace.id;
    const repo = new PrismaWorkspaceRepository(prisma);
    booking = new OpenBukStudioUseCase(
      new PrismaOpenBukRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma)),
      new PrismaUnitOfWork(prisma),
      new PrismaAuditAdapter(prisma),
      new PrismaOutboxAdapter(prisma),
      { now: () => now },
      new AuthorizeWorkspaceUseCase(repo),
      app,
      { windows: async () => null }
    );
  });
  afterAll(async () => {
    if (!prisma) {
      return;
    }
    for (const id of [tenantId, otherTenantId]) {
      await prisma.bookingAvailabilityRule.deleteMany({ where: { tenantId: id } });
      await prisma.bookingResource.deleteMany({ where: { tenantId: id } });
      await prisma.bookingServiceOffering.deleteMany({ where: { tenantId: id } });
      await prisma.extKv.deleteMany({ where: { tenantId: id } });
      await prisma.outboxEvent.deleteMany({ where: { tenantId: id } });
      await prisma.auditLog.deleteMany({ where: { tenantId: id } });
      await prisma.tenant.delete({ where: { id } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [owner, staff, outsider, rollbackStaff, rollbackOwner] } },
    });
    await prisma.onModuleDestroy();
  });
  it("resumes across concurrent starts with one workspace, legal entity and owner", async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => app.start(input, ctx)));
    expect(results.every((r) => r.workspace.id === workspaceId)).toBe(true);
    expect(await prisma.workspace.count({ where: { tenantId } })).toBe(1);
    expect(await prisma.legalEntity.count({ where: { tenantId } })).toBe(1);
    expect(await prisma.workspaceMembership.count({ where: { workspaceId } })).toBe(1);
    expect(
      await prisma.outboxEvent.count({ where: { tenantId, eventType: "workspace.pilot.started" } })
    ).toBe(1);
    expect(results[0].workspace.publicEnabled).toBe(false);
  });
  it("persists an incomplete locale/timezone/location draft without public availability", async () => {
    const context = { ...ctx, workspaceId };
    const draft = {
      studioName: "Private pilot",
      locale: "vi" as const,
      timezone: "Asia/Ho_Chi_Minh",
      weeklyHours: [],
    };
    await booking.saveSetup(draft, context);
    expect((await booking.getSetup(context)).draft).toEqual(draft);
    expect((await booking.getStudio(context)).studio).toBeNull();
    expect(await prisma.bookingResource.count({ where: { tenantId } })).toBe(0);
    expect(OpenBukSetupDraftSchema.safeParse({ timezone: "+07:00" }).success).toBe(false);
    await expect(booking.saveSetup({ timezone: "Mars/Olympus" }, context)).rejects.toThrow();
    await expect(booking.getSetup({ ...context, tenantId: otherTenantId })).rejects.toThrow(
      "access denied"
    );
    await expect(booking.configure(draft as never, context)).rejects.toThrow();
    await expect(booking.publicStudio(context)).rejects.toThrow();
  });
  it("retains service/staff identities when complete configuration is retried", async () => {
    const { slug, serviceId, staffId, ...setup } = studioFixture();
    const [a, b] = await Promise.all([
      booking.configure(setup, { ...ctx, workspaceId }),
      booking.configure(setup, { ...ctx, workspaceId }),
    ]);
    expect(a.studio.staffId).toBe(b.studio.staffId);
    expect(a.studio.serviceId).toBe(b.studio.serviceId);
    expect(await prisma.bookingResource.count({ where: { tenantId } })).toBe(1);
    expect((await prisma.workspace.findUnique({ where: { id: workspaceId } }))?.publicEnabled).toBe(
      false
    );
    await booking.saveSetup({ studioName: "Unpublished revision" }, { ...ctx, workspaceId });
    expect((await booking.getStudio({ ...ctx, workspaceId })).studio?.studioName).toBe(
      setup.studioName
    );
  });
  it("commits availability and publication together, rolling both back when publication events fail", async () => {
    const { slug, serviceId, staffId, ...setup } = studioFixture();
    const repo = new PrismaOpenBukRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma));
    const broken = new OpenBukStudioUseCase(
      repo,
      new PrismaUnitOfWork(prisma),
      new PrismaAuditAdapter(prisma),
      new PrismaOutboxAdapter(prisma),
      { now: () => now },
      new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(prisma)),
      build({
        enqueue: async () => {
          throw new Error("publication event unavailable");
        },
      }),
      { windows: async () => null }
    );
    await expect(
      broken.publishSetup({ ...setup, studioName: "Should roll back" }, { ...ctx, workspaceId })
    ).rejects.toThrow("publication event unavailable");
    expect(
      (await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } })).publicEnabled
    ).toBe(false);
    expect((await repo.studio({ tenantId, workspaceId }))?.studioName).toBe(setup.studioName);
    await Promise.all([
      booking.publishSetup(setup, { ...ctx, workspaceId }),
      booking.publishSetup(setup, { ...ctx, workspaceId }),
    ]);
    expect(
      (await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } })).publicEnabled
    ).toBe(true);
    expect(
      await prisma.outboxEvent.count({
        where: { tenantId, eventType: "workspace.booking.published" },
      })
    ).toBe(1);
    expect(
      await prisma.auditLog.count({ where: { tenantId, action: "workspace.booking.published" } })
    ).toBe(1);
  });
  it("replays concurrent normalized invitations and acceptance without duplicate memberships/events", async () => {
    const [a, b] = await Promise.all([
      app.invite(workspaceId, ` ${email.toUpperCase()} `, ctx),
      app.invite(workspaceId, email, ctx),
    ]);
    expect(a).toEqual(b);
    const [first, second] = await Promise.all([
      app.accept(a.invite.token, staffCtx),
      app.accept(b.invite.token, staffCtx),
    ]);
    expect(first).toEqual(second);
    expect(await prisma.membership.count({ where: { tenantId, userId: staff } })).toBe(1);
    expect(await prisma.workspaceMembership.count({ where: { workspaceId, userId: staff } })).toBe(
      1
    );
    expect(
      await prisma.outboxEvent.count({ where: { tenantId, eventType: "workspace.staff.joined" } })
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({ where: { tenantId, eventType: "workspace.staff.invited" } })
    ).toBe(1);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });
  it("rejects wrong accounts, expiry, foreign issuers, member invitations and direct publication including cache replay", async () => {
    const invite = await app.invite(workspaceId, `${outsider}@example.test`, ctx);
    await expect(app.accept(invite.invite.token, staffCtx)).rejects.toThrow("invited email");
    await prisma.user.update({ where: { id: outsider }, data: { status: "INACTIVE" } });
    await expect(
      app.accept(invite.invite.token, { ...staffCtx, userId: outsider })
    ).rejects.toThrow("invited email");
    await prisma.user.update({ where: { id: outsider }, data: { status: "ACTIVE" } });
    await prisma.workspaceInvite.update({
      where: { id: invite.invite.id },
      data: { status: "CANCELED" },
    });
    await expect(
      app.accept(invite.invite.token, { ...staffCtx, userId: outsider })
    ).rejects.toThrow("unavailable");
    await prisma.workspaceInvite.update({
      where: { id: invite.invite.id },
      data: { status: "PENDING" },
    });
    await prisma.workspaceInvite.update({
      where: { id: invite.invite.id },
      data: { expiresAt: new Date(now.getTime() - 1) },
    });
    await expect(
      app.accept(invite.invite.token, { ...staffCtx, userId: outsider })
    ).rejects.toThrow("expired");
    await expect(
      app.invite(workspaceId, email, { ...ctx, tenantId: otherTenantId })
    ).rejects.toThrow("access denied");
    await expect(app.invite(workspaceId, email, { ...ctx, userId: staff })).rejects.toThrow(
      "access denied"
    );
    const update = new UpdateWorkspaceUseCase(new PrismaWorkspaceRepository(prisma), {
      get: async () => ({ body: { workspace: { publicEnabled: true } } }),
      store: async () => {},
    });
    await expect(
      update.execute({
        tenantId,
        workspaceId,
        userId: staff,
        publicEnabled: true,
        idempotencyKey: "cached-owner-action",
      })
    ).rejects.toThrow("owners/admins");
    const { slug, serviceId, staffId, ...setup } = studioFixture();
    await expect(
      booking.publishSetup(setup, { tenantId, workspaceId, userId: staff })
    ).rejects.toThrow("access denied");
  });
  it("does not restore a disabled or deleted membership with an accepted token", async () => {
    const invite = await prisma.workspaceInvite.findFirstOrThrow({
      where: { workspaceId, email, status: "ACCEPTED" },
    });
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId, userId: staff } },
      data: { status: "DISABLED" },
    });
    await expect(app.accept(invite.token, staffCtx)).rejects.toThrow("no longer");
    await prisma.workspaceMembership.delete({
      where: { workspaceId_userId: { workspaceId, userId: staff } },
    });
    await expect(app.accept(invite.token, staffCtx)).rejects.toThrow("no longer");
    expect(await prisma.workspaceMembership.count({ where: { workspaceId, userId: staff } })).toBe(
      0
    );
  });
  it("rolls back first workspace and invitation account association when event persistence fails", async () => {
    const fail = build({
      enqueue: async () => {
        throw new Error("outbox unavailable");
      },
    });
    const before = await prisma.legalEntity.count({ where: { tenantId } });
    await expect(
      fail.start({ ...input, name: `Rollback ${tenantId}` }, { ...ctx, userId: rollbackOwner })
    ).rejects.toThrow("outbox unavailable");
    expect(await prisma.legalEntity.count({ where: { tenantId } })).toBe(before);
    const invite = await app.invite(workspaceId, `${rollbackStaff}@example.test`, ctx);
    await expect(
      fail.accept(invite.invite.token, { ...staffCtx, userId: rollbackStaff })
    ).rejects.toThrow("outbox unavailable");
    expect(await prisma.membership.count({ where: { tenantId, userId: rollbackStaff } })).toBe(0);
    expect(
      await prisma.workspaceMembership.count({ where: { workspaceId, userId: rollbackStaff } })
    ).toBe(0);
    expect(
      (await prisma.workspaceInvite.findUnique({ where: { id: invite.invite.id } }))?.status
    ).toBe("PENDING");
    await expect(
      app.accept(invite.invite.token, { ...staffCtx, userId: rollbackStaff })
    ).resolves.toHaveProperty("membershipId");
  });
  it.each(["draft", "publish", "invite"] as const)(
    "completes %s permission revalidation when the database pool is saturated",
    async (operation) => {
      // PrismaService's pg pool has ten connections. Hold every transaction open
      // before starting work, so authorization cannot borrow an eleventh one.
      const concurrent = 10;
      let entered = 0;
      let release = () => {};
      const ready = new Promise<void>((resolve) => {
        release = resolve;
      });
      const real = new PrismaUnitOfWork(prisma);
      const uow: UnitOfWorkPort = {
        withinTransaction: <T>(work: (tx: TransactionContext) => Promise<T>) =>
          real.withinTransaction(async (tx) => {
            entered += 1;
            if (entered === concurrent) {
              release();
            }
            await ready;
            return work(tx);
          }),
      };
      const pilot = build(new PrismaOutboxAdapter(prisma), uow);
      const studio = new OpenBukStudioUseCase(
        new PrismaOpenBukRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma)),
        uow,
        new PrismaAuditAdapter(prisma),
        new PrismaOutboxAdapter(prisma),
        { now: () => now },
        new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(prisma)),
        pilot
      );
      const { slug, serviceId, staffId, ...setup } = studioFixture();
      const results = await Promise.allSettled(
        Array.from({ length: concurrent }, () => {
          if (operation === "invite") {
            return pilot.invite(workspaceId, `${randomUUID()}@example.test`, ctx);
          }
          if (operation === "publish") {
            return studio.publishSetup(setup, { ...ctx, workspaceId });
          }
          return studio.saveSetup({ studioName: "Concurrent draft" }, { ...ctx, workspaceId });
        })
      );
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(concurrent);
    }
  );
});
