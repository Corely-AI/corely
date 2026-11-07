import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { PrismaService } from "@corely/data";
import type { EmployeeTask, StaffDirectoryEntry } from "@corely/contracts";
import { tasksFixture } from "./task-fixture";
const url = process.env.TASKS_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/tasks_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Employee tasks persisted lifecycle and trust boundaries", () => {
  let f: Awaited<ReturnType<typeof tasksFixture>>;
  let prisma: PrismaService;
  let owner: StaffDirectoryEntry;
  let other: StaffDirectoryEntry;
  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    f = await tasksFixture(prisma);
    owner = await f.usecase.command(
      "create",
      null,
      { displayName: "Anna", accountId: f.staff },
      randomUUID(),
      f.ctx
    );
    other = await f.usecase.command("create", null, { displayName: "Ben" }, randomUUID(), f.ctx);
  });
  afterAll(async () => {
    await f?.cleanup();
    await prisma?.onModuleDestroy();
  });
  const http = (
    method: "get" | "post" | "patch",
    path: string,
    token = "manager",
    workspace?: string,
    key = randomUUID()
  ) =>
    request(f.app.getHttpServer())
      [method](`/tasks${path}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Workspace-Id", workspace ?? f.workspaceA)
      .set("X-Idempotency-Key", key);
  const create = (fields: object = {}, key = randomUUID()) =>
    http("post", "", "manager", undefined, key).send({
      title: "Prepare opening",
      ownerStaffId: owner.id,
      ...fields,
    });
  it("creates, assigns, edits, completes and reopens the same record with transactional events", async () => {
    const result = await create({ dueAt: "2026-11-09T09:00:00+01:00" });
    expect(result.status).toBe(201);
    const task = result.body as EmployeeTask;
    expect(task).toMatchObject({
      version: 1,
      ownerName: "Anna",
      status: "OPEN",
      dueAt: "2026-11-09T08:00:00.000Z",
    });
    expect(result.headers["cache-control"]).toBe("private, no-store");
    const edited = await http("patch", `/${task.id}`).send({
      title: "Prepare reception",
      ownerStaffId: other.id,
      dueAt: null,
      version: 1,
    });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ id: task.id, ownerStaffId: other.id, version: 2 });
    expect((await http("post", `/${task.id}/complete`).send({ version: 2 })).body).toMatchObject({
      version: 3,
      status: "COMPLETED",
    });
    const reopened = await http("post", `/${task.id}/reopen`).send({ version: 3 });
    expect(reopened.status).toBe(201);
    expect(reopened.body).toMatchObject({
      id: task.id,
      version: 4,
      status: "OPEN",
      completedAt: null,
    });
    expect(await prisma.auditLog.count({ where: { tenantId: f.tenantA, entityId: task.id } })).toBe(
      4
    );
    expect(
      await prisma.outboxEvent.count({
        where: {
          tenantId: f.tenantA,
          eventType: { startsWith: "tasks.task." },
          payloadJson: { contains: task.id },
        },
      })
    ).toBe(4);
  });
  it("validates contracts, idempotency headers and active workspace assignees", async () => {
    for (const fields of [
      { title: " " },
      { title: "x".repeat(241) },
      { dueAt: "tomorrow" },
      { dueAt: "2026-11-09T09:00:00+24:00" },
      { dueAt: "2026-11-09T09:00:00+99:99" },
      { dueAt: "9999-12-31T23:59:59-01:00" },
      { ownerStaffId: randomUUID() },
      { status: "COMPLETED" },
    ]) {
      expect((await create(fields)).status).toBe(400);
    }
    expect(
      (
        await http("post", "", "manager", undefined, "invalid key").send({
          title: "x",
          ownerStaffId: owner.id,
        })
      ).status
    ).toBe(400);
    const foreign = await f.usecase.command(
      "create",
      null,
      { displayName: "Other workspace" },
      randomUUID(),
      { ...f.ctx, workspaceId: f.workspaceA2 }
    );
    expect((await create({ ownerStaffId: foreign.id })).status).toBe(400);
  });
  it("scopes staff reads and transitions to their linked active profile, with neutral projections", async () => {
    const mine = (await create()).body as EmployeeTask;
    const theirs = (await create({ ownerStaffId: other.id })).body as EmployeeTask;
    const list = await http("get", "", "staff");
    expect(list.status).toBe(200);
    expect(list.body.capabilities).toEqual({ manage: false, completeOwn: true });
    expect(list.body.items.some((t: EmployeeTask) => t.id === mine.id)).toBe(true);
    expect(list.body.items.every((t: EmployeeTask) => t.ownerStaffId === owner.id)).toBe(true);
    expect(JSON.stringify(list.body)).not.toMatch(/accountId|partyId|password|private|email/);
    expect((await http("get", `/${theirs.id}`, "staff")).status).toBe(404);
    expect(
      (await http("post", `/${theirs.id}/complete`, "staff").send({ version: 1 })).status
    ).toBe(404);
    expect((await http("get", "/assignees", "staff")).status).toBe(403);
    expect(
      (await http("post", "", "staff").send({ title: "x", ownerStaffId: owner.id })).status
    ).toBe(403);
    expect(
      (
        await http("patch", `/${mine.id}`, "staff").send({
          title: "x",
          ownerStaffId: other.id,
          version: 1,
        })
      ).status
    ).toBe(403);
    expect(
      (await http("post", `/${mine.id}/complete`, "staff").send({ version: 1 })).body.status
    ).toBe("COMPLETED");
    expect(
      (await http("post", `/${mine.id}/reopen`, "staff").send({ version: 2 })).body.status
    ).toBe("OPEN");
  });
  it("rejects cross-tenant/workspace requests and stale token roles", async () => {
    const task = (await create()).body as EmployeeTask;
    expect((await http("get", `/${task.id}`, "manager", f.workspaceA2)).status).toBe(404);
    expect((await http("get", `/${task.id}`, "outsider", f.workspaceB)).status).toBe(404);
    expect((await http("get", "", "outsider")).status).toBe(403);
    expect((await http("get", "", "staff", f.workspaceA2)).status).toBe(403);
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
      data: { status: "DISABLED" },
    });
    expect((await http("get", "", "staff")).status).toBe(403);
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
      data: { status: "ACTIVE" },
    });
  });
  it("serializes duplicate commands and returns current versions on replay without duplicate events", async () => {
    const key = randomUUID();
    const responses = await Promise.all(Array.from({ length: 8 }, () => create({}, key)));
    expect(responses.every((r) => r.status === 201)).toBe(true);
    expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
    const id = responses[0].body.id as string;
    expect(await prisma.auditLog.count({ where: { tenantId: f.tenantA, entityId: id } })).toBe(1);
    expect((await create({ title: "Different payload" }, key)).status).toBe(409);
    const completionKey = randomUUID();
    expect(
      (
        await http("post", `/${id}/complete`, "staff", undefined, completionKey).send({
          version: 1,
        })
      ).status
    ).toBe(201);
    expect((await create({}, key)).body).toMatchObject({ id, version: 2, status: "COMPLETED" });
    await prisma.rolePermissionGrant.updateMany({
      where: { tenantId: f.tenantA, roleId: f.staffRole, permissionKey: "tasks.own.update" },
      data: { effect: "DENY" },
    });
    expect(
      (
        await http("post", `/${id}/complete`, "staff", undefined, completionKey).send({
          version: 1,
        })
      ).status
    ).toBe(403);
    await prisma.rolePermissionGrant.updateMany({
      where: { tenantId: f.tenantA, roleId: f.staffRole, permissionKey: "tasks.own.update" },
      data: { effect: "ALLOW" },
    });
  });
  it("rejects stale edits and simultaneous conflicting transitions without losing updates", async () => {
    const task = (await create()).body as EmployeeTask;
    const responses = await Promise.all([
      http("patch", `/${task.id}`).send({
        title: "First edit",
        ownerStaffId: owner.id,
        version: 1,
      }),
      http("post", `/${task.id}/complete`).send({ version: 1 }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual(expect.arrayContaining([409]));
    expect(responses.filter((r) => r.status < 300)).toHaveLength(1);
    expect((await http("get", `/${task.id}`)).body.version).toBe(2);
    expect((await http("post", `/${task.id}/reopen`).send({ version: 1 })).status).toBe(409);
  });
  it("requires installed and effectively enabled apps on reads and retries", async () => {
    const key = randomUUID();
    await create({}, key);
    await f.disableApp.execute({ tenantId: f.tenantA, appId: "tasks", actorUserId: f.manager });
    expect((await http("get", "")).status).toBe(403);
    expect((await create({}, key)).status).toBe(403);
    await f.enableApp.execute({ tenantId: f.tenantA, appId: "tasks", actorUserId: f.manager });
    await f.entitlementService.updateAppEnablement(f.tenantA, "people", false, f.manager, true);
    expect((await http("get", "")).status).toBe(403);
    await f.entitlementService.updateAppEnablement(f.tenantA, "tasks", true, f.manager);
  });
  it("revalidates permissions and uncached app policy after the command lock", async () => {
    const transaction = f.taskRepo.transaction.bind(f.taskRepo);
    const revoke = vi
      .spyOn(f.taskRepo, "transaction")
      .mockImplementationOnce(async (scope, work) => {
        await prisma.rolePermissionGrant.updateMany({
          where: { tenantId: f.tenantA, roleId: f.managerRole, permissionKey: "tasks.manage" },
          data: { effect: "DENY" },
        });
        return transaction(scope, work);
      });
    expect((await create()).status).toBe(403);
    revoke.mockRestore();
    await prisma.rolePermissionGrant.updateMany({
      where: { tenantId: f.tenantA, roleId: f.managerRole, permissionKey: "tasks.manage" },
      data: { effect: "ALLOW" },
    });
    // Prime the normal read cache, then change the persisted policy without invalidating it.
    expect((await http("get", "")).status).toBe(200);
    const disable = vi
      .spyOn(f.taskRepo, "transaction")
      .mockImplementationOnce(async (scope, work) => {
        await prisma.tenantFeatureOverride.upsert({
          where: { tenantId_featureKey: { tenantId: f.tenantA, featureKey: "app.tasks.enabled" } },
          create: {
            tenantId: f.tenantA,
            featureKey: "app.tasks.enabled",
            valueJson: "false",
            updatedBy: f.manager,
          },
          update: { valueJson: "false" },
        });
        return transaction(scope, work);
      });
    expect((await create()).status).toBe(403);
    disable.mockRestore();
    await f.entitlementService.updateAppEnablement(f.tenantA, "tasks", true, f.manager);
  });
  it("rolls back the task, audit, outbox and replay together on delivery-record failures", async () => {
    for (const target of ["audit", "outbox"] as const) {
      const before = await prisma.extKv.count({
        where: { tenantId: f.tenantA, moduleId: "tasks" },
      });
      const beforeEvents = await prisma.outboxEvent.count({ where: { tenantId: f.tenantA } });
      const spy =
        target === "audit"
          ? vi.spyOn(f.audit, "log").mockRejectedValueOnce(new Error("test rollback"))
          : vi.spyOn(f.outbox, "enqueue").mockRejectedValueOnce(new Error("test rollback"));
      const key = randomUUID();
      await expect(
        f.tasks.command("create", null, { title: "Rollback", ownerStaffId: owner.id }, key, f.ctx)
      ).rejects.toThrow("test rollback");
      spy.mockRestore();
      expect(await prisma.extKv.count({ where: { tenantId: f.tenantA, moduleId: "tasks" } })).toBe(
        before
      );
      expect(await prisma.outboxEvent.count({ where: { tenantId: f.tenantA } })).toBe(beforeEvents);
      expect((await create({ title: "Rollback" }, key)).status).toBe(201);
    }
  });
  it("preserves archival history while rejecting new assignments to archived profiles", async () => {
    const archived = await f.usecase.command(
      "create",
      null,
      { displayName: "Retired profile" },
      randomUUID(),
      f.ctx
    );
    const task = (await create({ ownerStaffId: archived.id })).body as EmployeeTask;
    await f.usecase.command("archive", archived.id, { version: 1 }, randomUUID(), f.ctx);
    expect((await create({ ownerStaffId: archived.id })).status).toBe(400);
    expect((await http("get", `/${task.id}`)).body).toMatchObject({
      ownerStaffId: archived.id,
      ownerName: "Retired profile",
      ownerArchived: true,
    });
    expect((await http("post", `/${task.id}/complete`).send({ version: 1 })).status).toBe(201);
    expect(
      (await http("get", "/assignees")).body.some((p: { id: string }) => p.id === archived.id)
    ).toBe(false);
    const response = await http("patch", `/${task.id}`).send({
      title: "Historical task",
      ownerStaffId: other.id,
      version: 2,
    });
    expect(response.status).toBe(200);
    expect(response.body.ownerStaffId).toBe(other.id);
  });
});
