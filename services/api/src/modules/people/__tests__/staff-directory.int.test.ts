import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { PrismaService } from "@corely/data";
import { StaffDirectoryUseCase } from "../application/staff-directory.usecase";
import { staffFixture } from "./staff-fixture";

const url = process.env.PEOPLE_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/people_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("People persisted HTTP, privacy and transaction boundaries", () => {
  let f: Awaited<ReturnType<typeof staffFixture>>;
  let prisma: PrismaService;
  const key = () => randomUUID();
  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    f = await staffFixture(prisma);
  });
  afterAll(async () => {
    await f?.cleanup();
    await prisma?.onModuleDestroy();
  });
  const get = (path = "", token = "manager", workspace?: string) =>
    request(f.app.getHttpServer())
      .get(`/people/staff${path}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", workspace ?? f.workspaceA);
  const create = (body: object, commandKey = key(), token = "manager") =>
    request(f.app.getHttpServer())
      .post("/people/staff")
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", f.workspaceA)
      .set("X-Idempotency-Key", commandKey)
      .send(body);
  const patch = (id: string, body: object, token = "manager", path = "") =>
    request(f.app.getHttpServer())
      .patch(`/people/staff/${id}${path}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", f.workspaceA)
      .set("X-Idempotency-Key", key())
      .send(body);
  it("creates and edits staff without creating accounts, parties or booking resources", async () => {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.party.count(),
      prisma.bookingResource.count(),
    ]);
    const response = await create({ displayName: "No account required", team: "Studio" });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ workspaceId: f.workspaceA, version: 1, team: "Studio" });
    expect((await get(`/${response.body.id}/management`)).body.accountId).toBeNull();
    expect(
      (await patch(response.body.id, { displayName: "Updated name", version: 1 })).status
    ).toBe(200);
    expect(
      await Promise.all([prisma.user.count(), prisma.party.count(), prisma.bookingResource.count()])
    ).toEqual(counts);
  });
  it("validates explicit owner links and returns only neutral allowlisted fields to Staff", async () => {
    const created = await create({
      displayName: "Linked staff",
      accountId: f.staff,
      partyId: f.party.id,
      resourceId: f.resource.id,
    });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect((await get(`/${id}/management`)).body).toMatchObject({
      accountId: f.staff,
      partyId: f.party.id,
    });
    const detail = await get(`/${id}`, "staff");
    expect(detail.status).toBe(200);
    expect(detail.headers["cache-control"]).toBe("private, no-store");
    expect(Object.keys(detail.body).sort()).toEqual(
      [
        "id",
        "workspaceId",
        "displayName",
        "jobTitle",
        "team",
        "location",
        "managerStaffId",
        "resourceId",
        "version",
        "archivedAt",
        "createdAt",
        "updatedAt",
      ].sort()
    );
    expect((await get(`/${id}/management`, "staff")).status).toBe(403);
    expect((await get("", "staff")).text).not.toContain("party-secret");
    const duplicate = await create({ displayName: "Duplicate", accountId: f.staff });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("People:IdentityLinkConflict");
    expect((await create({ displayName: "Duplicate", partyId: f.party.id })).status).toBe(409);
    expect((await create({ displayName: "Duplicate", resourceId: f.resource.id })).status).toBe(
      409
    );
  });
  it("rejects cross-tenant/workspace links, resources without a workspace, and non-staff resources", async () => {
    for (const body of [
      { accountId: f.outsider },
      { partyId: f.foreignParty.id },
      { resourceId: f.foreignResource.id },
    ])
      expect((await create({ displayName: "Invalid link", ...body })).status).toBe(400);
    for (const data of [
      { workspaceId: null, type: "STAFF" as const },
      { workspaceId: f.workspaceA, type: "ROOM" as const },
    ]) {
      const resource = await prisma.bookingResource.create({
        data: { tenantId: f.tenantA, name: "Invalid", tags: [], ...data },
      });
      expect((await create({ displayName: "Invalid", resourceId: resource.id })).status).toBe(400);
    }
  });
  it("requires the linked account's active workspace membership", async () => {
    const linked = await create({ displayName: "Manager link", accountId: f.manager });
    expect(linked.status).toBe(201);
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
      data: { status: "DISABLED" },
    });
    expect(
      await f.accountLookup.exists({ tenantId: f.tenantA, workspaceId: f.workspaceA }, f.staff)
    ).toBe(false);
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.staff } },
      data: { status: "ACTIVE" },
    });
  });
  it("does not retrieve private values for neutral reads/search and enforces separate permissions", async () => {
    const id = (await create({ displayName: "Private profile" })).body.id;
    const saved = await patch(
      id,
      {
        version: 0,
        personalEmail: "hidden@example.invalid",
        personalPhone: "secret-phone",
        notes: "secret-reason",
      },
      "manager",
      "/private"
    );
    expect(saved.status).toBe(200);
    expect(saved.text).not.toContain("secret");
    expect((await get(`/${id}/private`)).body).toMatchObject({
      personalEmail: "hidden@example.invalid",
      notes: "secret-reason",
      version: 1,
    });
    const spy = vi.spyOn(f.repo, "privateGet");
    spy.mockClear();
    expect((await get(`/${id}`, "staff")).status).toBe(200);
    expect((await get("?q=secret-reason", "staff")).body.total).toBe(0);
    expect((await get("?q=hidden%40example.invalid", "staff")).body.total).toBe(0);
    expect((await get(`/${id}/private`, "staff")).status).toBe(403);
    expect((await patch(id, { version: 1, notes: "changed" }, "staff", "/private")).status).toBe(
      403
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect((await patch(id, { version: 0, notes: "stale" }, "manager", "/private")).status).toBe(
      409
    );
    const logs = await prisma.auditLog.findMany({ where: { tenantId: f.tenantA, entityId: id } });
    const events = await prisma.outboxEvent.findMany({ where: { tenantId: f.tenantA } });
    expect(JSON.stringify([logs, events])).not.toMatch(
      /secret-reason|hidden@example.invalid|secret-phone/
    );
  });
  it("export/audit grants do not grant private read; explicit denial overrides wildcard", async () => {
    const id = (await create({ displayName: "Restricted" })).body.id;
    await prisma.rolePermissionGrant.createMany({
      data: ["people.export", "people.audit.read"].map((permissionKey) => ({
        tenantId: f.tenantA,
        roleId: f.staffRole,
        permissionKey,
        effect: "ALLOW",
      })),
    });
    expect((await get(`/${id}/private`, "staff")).status).toBe(403);
    await prisma.rolePermissionGrant.createMany({
      data: [
        { tenantId: f.tenantA, roleId: f.staffRole, permissionKey: "*", effect: "ALLOW" },
        {
          tenantId: f.tenantA,
          roleId: f.staffRole,
          permissionKey: "people.private.read",
          effect: "DENY",
        },
      ],
    });
    expect((await get(`/${id}/private`, "staff")).status).toBe(403);
    await prisma.rolePermissionGrant.deleteMany({
      where: { roleId: f.staffRole, permissionKey: { in: ["*", "people.private.read"] } },
    });
  });
  it("isolates guessed IDs and direct routes across two tenants and multiple workspaces", async () => {
    const id = (await create({ displayName: "Scoped profile" })).body.id;
    for (const suffix of ["", "/management", "/private"]) {
      expect((await get(`/${id}${suffix}`, "manager", f.workspaceA2)).status).toBe(404);
      expect((await get(`/${id}${suffix}`, "outsider", f.workspaceB)).status).toBe(404);
    }
    expect((await get("", "manager", f.workspaceA2)).body.total).toBe(0);
    expect((await get("", "manager", f.workspaceB)).status).toBe(403);
    expect((await get("", "staff", f.workspaceA2)).status).toBe(403);
    expect(
      (await create({ displayName: "Spoof", tenantId: f.tenantB, workspaceId: f.workspaceB }))
        .status
    ).toBe(400);
    expect((await get("?workspaceId=" + f.workspaceB)).status).toBe(400);
    expect(
      (await get("", "manager").set("x-tenant-id", f.tenantB).set("x-user-id", f.outsider)).status
    ).toBe(200);
  });
  it("rechecks persisted role changes and workspace/tenant membership revocation on every call", async () => {
    await prisma.membership.update({
      where: { tenantId_userId: { tenantId: f.tenantA, userId: f.manager } },
      data: { roleId: f.staffRole },
    });
    expect((await create({ displayName: "Revoked manager" })).status).toBe(403);
    await prisma.membership.update({
      where: { tenantId_userId: { tenantId: f.tenantA, userId: f.manager } },
      data: { roleId: f.managerRole },
    });
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.manager } },
      data: { status: "DISABLED" },
    });
    expect((await get()).status).toBe(403);
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.manager } },
      data: { status: "ACTIVE" },
    });
    await prisma.membership.delete({
      where: { tenantId_userId: { tenantId: f.tenantA, userId: f.manager } },
    });
    expect((await get()).status).toBe(403);
    await prisma.membership.create({
      data: { tenantId: f.tenantA, userId: f.manager, roleId: f.managerRole },
    });
    expect((await get()).status).toBe(200);
  });
  it("validates manager scope, active status and reporting cycles", async () => {
    const manager = (await create({ displayName: "Lead" })).body;
    const direct = (await create({ displayName: "Report", managerStaffId: manager.id })).body;
    expect(
      (
        await patch(manager.id, {
          displayName: "Lead",
          managerStaffId: direct.id,
          version: manager.version,
        })
      ).status
    ).toBe(400);
    expect(
      (await create({ displayName: "Bad manager", managerStaffId: "guessed-other-workspace-id" }))
        .status
    ).toBe(400);
    await f.usecase.command("archive", manager.id, { version: manager.version }, key(), f.ctx);
    expect((await create({ displayName: "New report", managerStaffId: manager.id })).status).toBe(
      400
    );
    expect((await get(`/${direct.id}`)).body.managerStaffId).toBe(manager.id);
  });
  it("replays only once, rejects a conflicting payload and rejects stale updates", async () => {
    const commandKey = key();
    const first = await create({ displayName: "Replay" }, commandKey);
    const second = await create({ displayName: "Replay" }, commandKey);
    expect(second.body).toEqual(first.body);
    expect((await create({ displayName: "Different payload" }, commandKey)).status).toBe(409);
    expect(await prisma.auditLog.count({ where: { entityId: first.body.id } })).toBe(1);
    expect((await patch(first.body.id, { displayName: "New", version: 1 })).status).toBe(200);
    expect((await patch(first.body.id, { displayName: "Old", version: 1 })).status).toBe(409);
  });
  it("allows exactly one simultaneous duplicate link and one simultaneous versioned write", async () => {
    const resource = await prisma.bookingResource.create({
      data: {
        tenantId: f.tenantA,
        workspaceId: f.workspaceA,
        type: "STAFF",
        name: "Concurrent",
        tags: [],
      },
    });
    const attempts = await Promise.all([
      create({ displayName: "Concurrent A", resourceId: resource.id }),
      create({ displayName: "Concurrent B", resourceId: resource.id }),
    ]);
    expect(attempts.map((r) => r.status).sort()).toEqual([201, 409]);
    const id = attempts.find((r) => r.status === 201)!.body.id;
    const writes = await Promise.all([
      patch(id, { displayName: "Change A", version: 1 }),
      patch(id, { displayName: "Change B", version: 1 }),
    ]);
    expect(writes.map((r) => r.status).sort()).toEqual([200, 409]);
  });
  it("retains archived identity/history and never edits or deletes linked owners", async () => {
    const before = await prisma.bookingResource.findUnique({ where: { id: f.resource.id } });
    const linked = (await get("?q=Linked%20staff")).body.items[0];
    await f.usecase.command("archive", linked.id, { version: linked.version }, key(), f.ctx);
    expect((await get(`/${linked.id}`, "staff")).body).toMatchObject({
      id: linked.id,
      resourceId: f.resource.id,
    });
    expect((await get("?archived=archived&q=Linked")).body.total).toBe(1);
    expect((await get("?q=Linked")).body.total).toBe(0);
    expect(
      (await patch(linked.id, { displayName: "Cannot edit", version: linked.version + 1 })).status
    ).toBe(409);
    expect(
      (await create({ displayName: "Cannot reuse historical link", resourceId: f.resource.id }))
        .status
    ).toBe(409);
    expect(await prisma.bookingResource.findUnique({ where: { id: f.resource.id } })).toEqual(
      before
    );
    expect(await prisma.user.findUnique({ where: { id: f.staff } })).not.toBeNull();
  });
  it("rolls back profile, audit and command replay when transactional delivery fails", async () => {
    const failing = new StaffDirectoryUseCase(
      f.repo,
      f.permissions,
      f.accountLookup,
      f.partyLookup,
      f.resourceLookup,
      f.audit,
      {
        enqueue: async () => {
          throw new Error("synthetic outbox failure");
        },
      },
      f.platformEntitlements,
      f.booking
    );
    const before = await prisma.auditLog.count({ where: { tenantId: f.tenantA } });
    const commandKey = key();
    await expect(
      failing.command("create", null, { displayName: "Rollback" }, commandKey, f.ctx)
    ).rejects.toThrow("synthetic outbox failure");
    expect((await get("?q=Rollback")).body.total).toBe(0);
    expect(await prisma.auditLog.count({ where: { tenantId: f.tenantA } })).toBe(before);
    expect((await create({ displayName: "Retry rollback" }, commandKey)).status).toBe(201);
  });
  it("honors persisted app disablement independently of role grants", async () => {
    await f.entitlementService.updateAppEnablement(f.tenantA, "people", false, f.manager);
    expect((await get()).status).toBe(403);
    expect((await create({ displayName: "Disabled app" })).status).toBe(403);
    await f.entitlementService.updateAppEnablement(f.tenantA, "people", true, f.manager);
    expect((await get()).status).toBe(200);
  });
  it("denies reads, private retrieval, writes and replay after the Platform app is disabled", async () => {
    const commandKey = key();
    const created = await create({ displayName: "Install gate" }, commandKey);
    const id = created.body.id;
    const scope = { tenantId: f.tenantA, actorUserId: f.manager, appId: "people" };
    await f.disableApp.execute(scope);
    const privateRead = vi.spyOn(f.repo, "privateGet");
    try {
      expect(await f.entitlements.isAppEnabled(f.tenantA, "people")).toBe(true);
      for (const path of ["", `/${id}`, `/${id}/management`, `/${id}/private`]) {
        expect((await get(path)).status).toBe(403);
      }
      expect((await create({ displayName: "Install gate" }, commandKey)).status).toBe(403);
      expect((await patch(id, { displayName: "Disabled update", version: 1 })).status).toBe(403);
      expect(privateRead).not.toHaveBeenCalled();
    } finally {
      privateRead.mockRestore();
      await f.enableApp.execute(scope);
    }
    expect((await get(`/${id}`)).status).toBe(200);
    await prisma.tenantAppInstall.delete({
      where: { tenantId_appId: { tenantId: f.tenantA, appId: "people" } },
    });
    try {
      expect((await get()).status).toBe(403);
    } finally {
      await f.enableApp.execute(scope);
    }
  });
  it("requires authentication and a command key and rejects private/file fields in a neutral command", async () => {
    expect((await request(f.app.getHttpServer()).get("/people/staff")).status).toBe(401);
    expect(
      (
        await request(f.app.getHttpServer())
          .post("/people/staff")
          .set("Authorization", "Bearer manager")
          .set("x-workspace-id", f.workspaceA)
          .send({ displayName: "No key" })
      ).status
    ).toBe(400);
    expect(
      (await create({ displayName: "Private injection", notes: "secret", fileRefs: ["file"] }))
        .status
    ).toBe(400);
    expect((await get("?pageSize=101")).status).toBe(400);
    expect((await get("?pageSize=1")).body.items).toHaveLength(1);
  });
});
