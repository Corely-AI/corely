import { PrismaExtKvAdapter } from "@corely/data";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { EmployeeTasksUseCase } from "../../tasks/application/employee-tasks.usecase";
import { ExtTaskRepositoryAdapter } from "../../tasks/infrastructure/ext-task-repository.adapter";
import { absenceTestFixture, absenceTestsEnabled } from "./staff-absence-fixture";

describe.skipIf(!absenceTestsEnabled)("Manager absence exceptions", () => {
  const fixture = absenceTestFixture(true);

  it("projects current neutral task conflicts once without changing work or processing absence events", async () => {
    const { prisma, f, staffId, get, create, base, fields, grant } = fixture.current;
    const store = new ExtTaskRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma));
    const tasks = new EmployeeTasksUseCase(
      store,
      f.permissions,
      f.staffLookup,
      f.platformEntitlements,
      f.audit,
      f.outbox
    );
    const createTask = (title: string, dueAt: string | null) =>
      tasks.command("create", null, { title, ownerStaffId: staffId, dueAt }, randomUUID(), f.ctx);
    const task = await createTask("Prepare pickup", "2026-11-09T09:30:00Z");
    const boundary = await createTask("Reconcile inventory", "2026-11-09T10:00:00Z");
    await createTask("Call supplier", null);
    const completed = await createTask("Early close", "2026-11-09T09:45:00Z");
    await tasks.command(
      "complete",
      completed.id,
      { version: completed.version },
      randomUUID(),
      f.ctx
    );

    const absence = await create();
    const endpoint = "/people/staff/" + staffId + "/availability";
    const impact = endpoint + "?includeTaskImpact=true";
    const response = await get(impact);
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.body.affectedTasks).toEqual({
      available: true,
      items: [{ id: task.id, title: task.title, dueAt: task.dueAt }],
    });
    expect(response.body.evaluatedAt).toBe("2026-11-08T12:00:00.000Z");
    expect(JSON.stringify(response.body)).not.toMatch(/synthetic-private|documentId|reason|notes/);
    expect((await get(endpoint)).body.affectedTasks).toBeUndefined();
    expect((await get(impact, "staff")).status).toBe(403);
    expect((await get(impact, "manager", f.workspaceA2)).status).toBe(404);

    const correction = await request(f.app.getHttpServer())
      .patch(base() + "/" + absence.id)
      .set("Authorization", "Bearer manager")
      .set("x-workspace-id", f.workspaceA)
      .set("X-Idempotency-Key", randomUUID())
      .send({ ...fields("2026-11-09T09:50:00Z", "2026-11-09T10:30:00Z"), version: 1 });
    expect(correction.status).toBe(200);
    expect((await get(impact)).body.affectedTasks.items).toEqual([
      { id: boundary.id, title: boundary.title, dueAt: boundary.dueAt },
    ]);
    const cancelled = await request(f.app.getHttpServer())
      .post(base() + "/" + absence.id + "/cancel")
      .set("Authorization", "Bearer manager")
      .set("x-workspace-id", f.workspaceA)
      .set("X-Idempotency-Key", randomUUID())
      .send({ version: 2 });
    expect(cancelled.status).toBe(201);
    expect((await get(impact)).body.affectedTasks).toEqual({ available: true, items: [] });

    await grant(f.managerRole, "tasks.manage", "DENY");
    expect((await get(impact)).body.affectedTasks).toEqual({ available: false, items: [] });
    const records = await store.list({ tenantId: f.tenantA, workspaceId: f.workspaceA });
    expect(records).toHaveLength(4);
    expect(records.find((candidate) => candidate.id === task.id)).toMatchObject({
      status: "OPEN",
      version: 1,
    });
  });
});
