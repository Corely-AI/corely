import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { PrismaService } from "@corely/data";
import type { StaffDirectoryEntry } from "@corely/contracts";
import { tasksFixture } from "../../tasks/__tests__/task-fixture";
const url = process.env.PEOPLE_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/people_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Staff self-service and controlled lifecycle", () => {
  let prisma: PrismaService,
    f: Awaited<ReturnType<typeof tasksFixture>>,
    anna: StaffDirectoryEntry,
    ben: StaffDirectoryEntry;
  const staffCtx = () => ({ ...f.ctx, userId: f.staff });
  const scope = () => ({ tenantId: f.tenantA, workspaceId: f.workspaceA });
  const http = (
    method: "get" | "post" | "patch",
    path: string,
    token = "staff",
    workspace?: string,
    key = randomUUID()
  ) =>
    request(f.app.getHttpServer())
      [method](path)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Workspace-Id", workspace ?? f.workspaceA)
      .set("X-Idempotency-Key", key);
  const selfBody = async (extra: object = {}) => {
    const view = await f.self.detail(staffCtx());
    return {
      profileId: view.profile.id,
      version: view.profile.version,
      contactsVersion: view.contacts.version,
      displayName: "Anna updated",
      personalEmail: "anna@example.invalid",
      personalPhone: "+49 555 0101",
      ...extra,
    };
  };
  const onboardingBody = () => ({
    version: anna.version,
    title: "Approved onboarding",
    steps: [{ id: randomUUID(), title: "Read studio guide" }],
  });
  const managerAdmin = () =>
    prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.manager } },
      data: { role: "ADMIN" },
    });
  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
  });
  beforeEach(async () => {
    f = await tasksFixture(prisma);
    anna = await f.usecase.command(
      "create",
      null,
      {
        displayName: "Anna",
        jobTitle: "Stylist",
        team: "Studio",
        accountId: f.staff,
        resourceId: f.resource.id,
      },
      randomUUID(),
      f.ctx
    );
    ben = await f.usecase.command("create", null, { displayName: "Ben" }, randomUUID(), f.ctx);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    if (f) {
      await prisma.booking.deleteMany({ where: { tenantId: f.tenantA } });
      await prisma.bookingHold.deleteMany({ where: { tenantId: f.tenantA } });
      await f.cleanup();
    }
  });
  afterAll(async () => {
    await prisma?.onModuleDestroy();
  });
  it("returns only the linked subject's permitted profile, own contacts and working pattern", async () => {
    await f.usecase.command(
      "private",
      anna.id,
      {
        version: 0,
        personalEmail: "anna@example.invalid",
        personalPhone: null,
        notes: "manager-only-anna",
      },
      randomUUID(),
      f.ctx
    );
    await f.usecase.command(
      "private",
      ben.id,
      {
        version: 0,
        personalEmail: "ben-private@example.invalid",
        personalPhone: null,
        notes: "manager-only-ben",
      },
      randomUUID(),
      f.ctx
    );
    const result = await http("get", "/people/me");
    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("private, no-store");
    expect(result.body).toMatchObject({
      profile: { id: anna.id },
      contacts: { personalEmail: "anna@example.invalid" },
      canEdit: true,
    });
    expect(result.text).not.toMatch(
      /manager-only|ben-private|"accountId"|"partyId"|"notes"|"documents"|"affectedCommitments"/
    );
    expect((await http("get", `/people/staff/${ben.id}/private`)).status).toBe(403);
    expect((await http("get", `/people/staff/${anna.id}/management`)).status).toBe(403);
  });
  it("updates only allowlisted own fields while preserving manager notes, responsibilities and sign-in identity", async () => {
    await f.usecase.command(
      "private",
      anna.id,
      { version: 0, notes: "manager-only", personalEmail: null, personalPhone: null },
      randomUUID(),
      f.ctx
    );
    const before = await f.repo.get(scope(), anna.id),
      user = await prisma.user.findUnique({ where: { id: f.staff } });
    const result = await http("patch", "/people/me").send(await selfBody());
    expect(result.status).toBe(200);
    expect(result.body.profile).toMatchObject({
      id: anna.id,
      displayName: "Anna updated",
      team: "Studio",
      jobTitle: "Stylist",
    });
    expect(await f.repo.privateGet(scope(), anna.id)).toMatchObject({
      notes: "manager-only",
      personalEmail: "anna@example.invalid",
      personalPhone: "+49 555 0101",
      version: 2,
    });
    const after = await f.repo.get(scope(), anna.id);
    expect(after).toMatchObject({
      accountId: before?.accountId,
      resourceId: before?.resourceId,
      partyId: before?.partyId,
      managerStaffId: before?.managerStaffId,
    });
    expect(await prisma.user.findUnique({ where: { id: f.staff } })).toEqual(user);
  });
  it("rejects escalation fields and conflicting subject IDs without writing another staff record", async () => {
    const body = await selfBody();
    for (const extra of [
      { roleId: f.managerRole },
      { roles: ["OWNER"] },
      { managerStaffId: ben.id },
      { accountId: f.manager },
      { workspaceId: f.workspaceA2 },
      { tenantId: f.tenantB },
      { notes: "injected" },
      { team: "Management" },
      { jobTitle: "Owner" },
      { availability: {} },
      { fileIds: ["private-file"] },
    ])
      expect((await http("patch", "/people/me").send({ ...body, ...extra })).status).toBe(400);
    expect((await http("patch", "/people/me").send({ ...body, profileId: ben.id })).status).toBe(
      409
    );
    expect((await f.repo.get(scope(), ben.id))?.version).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { tenantId: f.tenantA, action: "people.staff.self_update" },
      })
    ).toBe(0);
  });
  it("authorizes current roles and real tenant/workspace context for direct lifecycle routes", async () => {
    expect((await http("get", `/people/staff/${anna.id}/lifecycle`)).status).toBe(403);
    expect(
      (await http("post", `/people/staff/${anna.id}/onboarding`).send(onboardingBody())).status
    ).toBe(403);
    expect(
      (
        await http("post", `/people/staff/${anna.id}/offboard`).send({
          version: 1,
          disableWorkspaceAccess: true,
        })
      ).status
    ).toBe(403);
    expect((await http("get", "/people/me", "staff", f.workspaceA2)).status).toBe(403);
    expect((await http("get", "/people/me", "outsider", f.workspaceB)).status).toBe(403);
    expect(
      (await http("get", `/people/staff/${anna.id}/lifecycle`, "outsider", f.workspaceB)).status
    ).toBe(404);
    expect(
      (await http("get", `/people/staff/${anna.id}/lifecycle`, "manager", f.workspaceA2)).status
    ).toBe(404);
  });
  it("binds a pending self edit to its original subject across workspace switches", async () => {
    const body = await selfBody();
    await prisma.workspaceMembership.create({
      data: { workspaceId: f.workspaceA2, userId: f.staff, role: "MEMBER", status: "ACTIVE" },
    });
    const other = await f.usecase.command(
      "create",
      null,
      { displayName: "Other workspace Anna", accountId: f.staff },
      randomUUID(),
      { ...f.ctx, workspaceId: f.workspaceA2 }
    );
    const result = await http("get", "/people/me", "staff", f.workspaceA2);
    expect(result.body.profile.id).toBe(other.id);
    expect(result.text).not.toContain("anna@example.invalid");
    expect((await http("patch", "/people/me", "staff", f.workspaceA2).send(body)).status).toBe(409);
    expect(
      (await f.repo.get({ tenantId: f.tenantA, workspaceId: f.workspaceA2 }, other.id))?.displayName
    ).toBe("Other workspace Anna");
  });
  it("replays own edits once, rejects stale versions, and rechecks authority after the write lock", async () => {
    const body = await selfBody(),
      key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        http("patch", "/people/me", "staff", undefined, key).send(body)
      )
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(new Set(results.map((r) => r.body.profile.version))).toEqual(new Set([2]));
    expect((await http("patch", "/people/me").send(body)).status).toBe(409);
    await prisma.rolePermissionGrant.updateMany({
      where: { tenantId: f.tenantA, roleId: f.staffRole, permissionKey: "people.self.update" },
      data: { effect: "DENY" },
    });
    expect((await http("get", "/people/me")).body.canEdit).toBe(false);
    expect((await http("patch", "/people/me", "staff", undefined, key).send(body)).status).toBe(
      403
    );
    await prisma.rolePermissionGrant.updateMany({
      where: { tenantId: f.tenantA, roleId: f.staffRole, permissionKey: "people.self.update" },
      data: { effect: "ALLOW" },
    });
    const pending = await selfBody();
    const transaction = f.repo.transaction.bind(f.repo);
    vi.spyOn(f.repo, "transaction").mockImplementationOnce(async (scope, work) => {
      await prisma.workspaceMembership.update({
        where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
        data: { status: "DISABLED" },
      });
      return transaction(scope, work);
    });
    expect((await http("patch", "/people/me").send(pending)).status).toBe(403);
  });
  it("exposes only own published availability, without granting schedule mutation", async () => {
    const current = await f.availability.detail(anna.id, f.ctx);
    await f.availability.save(
      anna.id,
      {
        version: current.version,
        profileVersion: current.profileVersion,
        pattern: {
          timezone: "Europe/Berlin",
          effectiveFrom: "2026-11-09",
          effectiveUntil: null,
          weeklyHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
          exceptions: [],
        },
      },
      randomUUID(),
      f.ctx
    );
    const view = await f.self.detail(staffCtx());
    expect(view.availability.plans[0].pattern.timezone).toBe("Europe/Berlin");
    expect(JSON.stringify(view)).not.toMatch(/affectedCommitments|manager-only/);
    expect(
      (
        await http("post", `/people/staff/${anna.id}/availability`).send({
          version: 1,
          profileVersion: 1,
          pattern: {},
        })
      ).status
    ).toBe(403);
  });
});
