import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { PrismaService } from "@corely/data";
import type { StaffDirectoryEntry } from "@corely/contracts";
import { tasksFixture } from "../../tasks/__tests__/task-fixture";
const url = process.env.PEOPLE_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/people_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Controlled onboarding and departure", () => {
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
  it("approves one ordinary checklist task under concurrent replay without granting access", async () => {
    const body = onboardingBody(),
      key = randomUUID();
    const grants = await prisma.rolePermissionGrant.findMany({ where: { tenantId: f.tenantA } });
    const member = await prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
    });
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        http("post", `/people/staff/${anna.id}/onboarding`, "manager", undefined, key).send(body)
      )
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    const task = results[0].body.onboardingTask;
    expect(new Set(results.map((r) => r.body.onboardingTask.id)).size).toBe(1);
    expect(task).toMatchObject({
      ownerStaffId: anna.id,
      checklist: [{ ...body.steps[0], completed: false }],
    });
    expect(await prisma.rolePermissionGrant.findMany({ where: { tenantId: f.tenantA } })).toEqual(
      grants
    );
    expect(
      await prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
      })
    ).toEqual(member);
    const before = await f.taskRepo.transaction(scope(), (tx) =>
      f.lifecycleRepo.get(scope(), anna.id, tx)
    );
    const checked = await f.tasks.command(
      "checklist",
      task.id,
      { version: 1, completed: true },
      randomUUID(),
      staffCtx(),
      body.steps[0].id
    );
    await f.tasks.command(
      "complete",
      task.id,
      { version: checked.version },
      randomUUID(),
      staffCtx()
    );
    expect((await f.self.detail(staffCtx())).onboardingTask).toMatchObject({
      id: task.id,
      status: "COMPLETED",
    });
    expect(
      await f.taskRepo.transaction(scope(), (tx) => f.lifecycleRepo.get(scope(), anna.id, tx))
    ).toEqual(before);
  });
  it("shows future commitments and preserves tasks/bookings when archiving with access follow-up", async () => {
    await f.lifecycle.command("onboarding", anna.id, onboardingBody(), randomUUID(), f.ctx);
    const startAt = new Date("2026-11-09T09:00:00Z"),
      endAt = new Date("2026-11-09T10:00:00Z");
    const booking = await prisma.booking.create({
      data: {
        tenantId: f.tenantA,
        workspaceId: f.workspaceA,
        startAt,
        endAt,
        status: "CONFIRMED",
        bookedByEmail: "visitor-private@example.invalid",
        notes: "customer-private",
        allocations: { create: { tenantId: f.tenantA, resourceId: f.resource.id, startAt, endAt } },
      },
    });
    await f.checklists.command(
      "publish",
      null,
      {
        title: "Opening routine",
        timezone: "UTC",
        effectiveFrom: "2026-11-08",
        effectiveUntil: null,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        dueTime: "09:00",
        assigneeIds: [anna.id],
        steps: [{ id: randomUUID(), title: "Open" }],
      },
      randomUUID(),
      f.ctx
    );
    const preview = await f.lifecycle.detail(anna.id, f.ctx);
    expect(preview.bookings).toEqual([expect.objectContaining({ id: booking.id })]);
    expect(preview.tasks.openTaskCount).toBe(1);
    expect(preview.tasks.recurringTemplates).toHaveLength(1);
    expect(JSON.stringify(preview)).not.toMatch(/visitor-private|customer-private/);
    const pending = await selfBody();
    const departed = await f.lifecycle.command(
      "offboard",
      anna.id,
      { version: anna.version, disableWorkspaceAccess: false },
      randomUUID(),
      f.ctx
    );
    expect(departed.profile.archivedAt).toBeTruthy();
    expect(departed.access.status).toBe("ACTIVE");
    expect(departed.tasks.openTasks[0]).toMatchObject({ status: "OPEN", ownerArchived: true });
    expect(await prisma.booking.findUnique({ where: { id: booking.id } })).toEqual(booking);
    expect((await http("get", "/people/me")).status).toBe(403);
    expect((await http("patch", "/people/me").send(pending)).status).toBe(403);
    expect((await f.generation.run()).updatedCount).toBe(0);
  });
  it("disables only the selected workspace through its owner and denies stale tokens/actions", async () => {
    await managerAdmin();
    await prisma.workspaceMembership.create({
      data: { workspaceId: f.workspaceA2, userId: f.staff, role: "MEMBER", status: "ACTIVE" },
    });
    const other = await f.usecase.command(
      "create",
      null,
      { displayName: "Anna other workspace", accountId: f.staff },
      randomUUID(),
      { ...f.ctx, workspaceId: f.workspaceA2 }
    );
    const identity = await prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId: f.tenantA, userId: f.staff } },
    });
    const pending = await selfBody();
    const result = await http("post", `/people/staff/${anna.id}/offboard`, "manager").send({
      version: anna.version,
      disableWorkspaceAccess: true,
    });
    expect(result.status).toBe(201);
    expect(result.body.access.status).toBe("DISABLED");
    for (const path of ["/people/me", "/tasks", `/people/staff/${anna.id}/private`])
      expect((await http("get", path)).status).toBe(403);
    expect((await http("patch", "/people/me").send(pending)).status).toBe(403);
    expect((await http("get", "/people/me", "staff", f.workspaceA2)).body.profile.id).toBe(
      other.id
    );
    expect(
      await prisma.membership.findUnique({
        where: { tenantId_userId: { tenantId: f.tenantA, userId: f.staff } },
      })
    ).toEqual(identity);
    expect(
      (await http("get", `/people/staff/${anna.id}/lifecycle`, "manager")).body.profile.archivedAt
    ).toBeTruthy();
  });
  it("uses the effective future recurring plan and hides reassigned onboarding from the former assignee", async () => {
    const approved = await f.lifecycle.command(
      "onboarding",
      anna.id,
      onboardingBody(),
      randomUUID(),
      f.ctx
    );
    const task = approved.onboardingTask!;
    await f.tasks.command(
      "update",
      task.id,
      { version: task.version, title: task.title, ownerStaffId: ben.id },
      randomUUID(),
      f.ctx
    );
    expect((await f.self.detail(staffCtx())).onboardingTask).toBeNull();
    expect((await f.lifecycle.detail(anna.id, f.ctx)).onboardingTask).toMatchObject({
      ownerStaffId: ben.id,
      ownerName: "Ben",
    });
    const plan = {
      title: "Superseded routine",
      timezone: "UTC",
      effectiveFrom: "2026-11-08",
      effectiveUntil: null,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      dueTime: "09:00",
      assigneeIds: [anna.id],
      steps: [{ id: randomUUID(), title: "Open" }],
    };
    const template = await f.checklists.command("publish", null, plan, randomUUID(), f.ctx);
    await f.checklists.command(
      "edit",
      template.id,
      {
        version: template.version,
        plan: {
          ...plan,
          title: "Ben's routine",
          effectiveFrom: "2026-11-09",
          assigneeIds: [ben.id],
        },
      },
      randomUUID(),
      f.ctx
    );
    f.setNow("2026-11-10T08:00:00Z");
    expect((await f.lifecycle.detail(anna.id, f.ctx)).tasks.recurringTemplates).toEqual([]);
    expect((await f.lifecycle.detail(ben.id, f.ctx)).tasks.recurringTemplates).toEqual([
      { id: template.id, title: "Ben's routine" },
    ]);
  });
  it("rolls back archival when workspace administration is missing or the target is an owner", async () => {
    const body = { version: anna.version, disableWorkspaceAccess: true };
    expect(
      (await http("post", `/people/staff/${anna.id}/offboard`, "manager").send(body)).status
    ).toBe(403);
    expect((await f.repo.get(scope(), anna.id))?.archivedAt).toBeNull();
    await managerAdmin();
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
      data: { role: "OWNER" },
    });
    expect(
      (await http("post", `/people/staff/${anna.id}/offboard`, "manager").send(body)).status
    ).toBe(403);
    expect((await f.repo.get(scope(), anna.id))?.archivedAt).toBeNull();
  });
  it("revalidates replay authority without repeating disablement after a later reactivation", async () => {
    await managerAdmin();
    const key = randomUUID(),
      body = { version: anna.version, disableWorkspaceAccess: true };
    expect(
      (
        await http("post", `/people/staff/${anna.id}/offboard`, "manager", undefined, key).send(
          body
        )
      ).status
    ).toBe(201);
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
      data: { status: "ACTIVE" },
    });
    const replay = await http(
      "post",
      `/people/staff/${anna.id}/offboard`,
      "manager",
      undefined,
      key
    ).send(body);
    expect(replay.status).toBe(201);
    expect(replay.body.access.status).toBe("ACTIVE");
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.manager } },
      data: { role: "MEMBER" },
    });
    expect(
      (
        await http("post", `/people/staff/${anna.id}/offboard`, "manager", undefined, key).send(
          body
        )
      ).status
    ).toBe(403);
    expect(
      await prisma.auditLog.count({
        where: { tenantId: f.tenantA, action: "workspaces.member.disable" },
      })
    ).toBe(1);
  });
  it("rolls back profile, membership, audit, outbox and replay together on persistence failure", async () => {
    await managerAdmin();
    const key = randomUUID(),
      body = { version: anna.version, disableWorkspaceAccess: true };
    const before = await prisma.auditLog.count({ where: { tenantId: f.tenantA } });
    const enqueue = f.outbox.enqueue.bind(f.outbox);
    vi.spyOn(f.outbox, "enqueue").mockImplementation((event, tx) =>
      event.eventType === "people.staff.offboard"
        ? Promise.reject(new Error("fixture rollback"))
        : enqueue(event, tx)
    );
    await expect(f.lifecycle.command("offboard", anna.id, body, key, f.ctx)).rejects.toThrow(
      "fixture rollback"
    );
    vi.restoreAllMocks();
    expect((await f.repo.get(scope(), anna.id))?.archivedAt).toBeNull();
    expect(
      (
        await prisma.workspaceMembership.findUnique({
          where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
        })
      )?.status
    ).toBe("ACTIVE");
    expect(await prisma.auditLog.count({ where: { tenantId: f.tenantA } })).toBe(before);
    expect((await f.lifecycle.command("offboard", anna.id, body, key, f.ctx)).access.status).toBe(
      "DISABLED"
    );
  });
  it("revalidates manager permissions inside the lifecycle transaction before creating a task", async () => {
    const key = randomUUID(),
      body = onboardingBody();
    const transaction = f.taskStaff.transaction.bind(f.taskStaff);
    vi.spyOn(f.taskStaff, "transaction").mockImplementationOnce(async (scope, work) => {
      await prisma.rolePermissionGrant.updateMany({
        where: {
          tenantId: f.tenantA,
          roleId: f.managerRole,
          permissionKey: "people.profile.manage",
        },
        data: { effect: "DENY" },
      });
      return transaction(scope, work);
    });
    expect(
      (
        await http("post", `/people/staff/${anna.id}/onboarding`, "manager", undefined, key).send(
          body
        )
      ).status
    ).toBe(403);
    expect(await f.taskRepo.list(scope())).toEqual([]);
    expect(
      await prisma.auditLog.count({
        where: { tenantId: f.tenantA, action: "people.staff.onboarding" },
      })
    ).toBe(0);
    await prisma.rolePermissionGrant.updateMany({
      where: { tenantId: f.tenantA, roleId: f.managerRole, permissionKey: "people.profile.manage" },
      data: { effect: "ALLOW" },
    });
    expect(
      (
        await http("post", `/people/staff/${anna.id}/onboarding`, "manager", undefined, key).send(
          body
        )
      ).status
    ).toBe(201);
    expect(await f.taskRepo.list(scope())).toHaveLength(1);
  });
});
