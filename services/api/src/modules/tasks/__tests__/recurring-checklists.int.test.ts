import { afterAll, beforeAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { StaffDirectoryEntry, ChecklistTemplateView } from "@corely/contracts";
import { tasksFixture } from "./task-fixture";
const url = process.env.TASKS_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/tasks_test_[a-z0-9_]+(?:\?.*)?$/.test(url);
describe.skipIf(!enabled)("Recurring checklists persisted generation and lifecycle", () => {
  let f: Awaited<ReturnType<typeof tasksFixture>>,
    prisma: PrismaService,
    owner: StaffDirectoryEntry,
    other: StaffDirectoryEntry;
  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
  });
  beforeEach(async () => {
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
  afterEach(async () => {
    vi.restoreAllMocks();
    await f?.cleanup();
  });
  afterAll(async () => {
    await prisma?.onModuleDestroy();
  });
  const publish = (fields: object = {}, key = randomUUID()) =>
    f.checklists.command(
      "publish",
      null,
      {
        title: "Opening",
        timezone: "Europe/Berlin",
        effectiveFrom: "2026-11-08",
        effectiveUntil: null,
        dueTime: "09:00",
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        assigneeIds: [owner.id],
        steps: [
          { id: randomUUID(), title: "Unlock reception" },
          { id: randomUUID(), title: "Check equipment" },
        ],
        ...fields,
      },
      key,
      f.ctx
    );
  const command = (
    kind: "generate" | "edit" | "pause" | "resume" | "end" | "skip",
    row: ChecklistTemplateView,
    fields: object = {},
    key = randomUUID()
  ) => f.checklists.command(kind, row.id, { version: row.version, ...fields }, key, f.ctx);
  it("creates one task with snapshot checkboxes per assignee even under concurrent replay", async () => {
    const row = await publish({ assigneeIds: [owner.id, other.id] });
    const settled = await Promise.allSettled(
      Array.from({ length: 12 }, () => command("generate", row))
    );
    const results = settled.map((result) => {
      if (result.status === "rejected") throw result.reason;
      return result.value;
    });
    const occurrence = results[0].occurrences[0];
    expect(occurrence.taskIds).toHaveLength(2);
    expect(new Set(results.map((r) => r.occurrences[0].id)).size).toBe(1);
    const tasks = (await f.tasks.list({}, f.ctx)).items;
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({
      title: "Opening",
      status: "OPEN",
      dueAt: "2026-11-08T08:00:00.000Z",
      recurrence: { templateId: row.id, templateVersion: 1, localDate: "2026-11-08" },
    });
    expect(tasks[0].checklist?.map((s) => s.completed)).toEqual([false, false]);
    expect(
      await prisma.auditLog.count({
        where: { tenantId: f.tenantA, action: "tasks.checklist.materialize" },
      })
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: { tenantId: f.tenantA, eventType: "tasks.task.create" },
      })
    ).toBe(2);
    expect(JSON.stringify(row)).not.toMatch(/publisherUserId|nextEvaluationAt/);
  }, 25000);
  it("lets only the assignee check every step before completion; replay and reopen keep the template immutable", async () => {
    const row = await publish();
    const generated = await command("generate", row);
    let task = await f.tasks.detail(generated.occurrences[0].taskIds[0], f.ctx);
    const snapshot = await f.recurringRepo.get(
      f.ctx as { tenantId: string; workspaceId: string },
      row.id
    );
    const staffCtx = { ...f.ctx, userId: f.staff };
    await expect(
      f.tasks.command("complete", task.id, { version: 1 }, randomUUID(), staffCtx)
    ).rejects.toThrow("Complete every checklist");
    const key = randomUUID(),
      step = task.checklist![0];
    const input = { version: task.version, completed: true };
    task = await f.tasks.command("checklist", task.id, input, key, staffCtx, step.id);
    expect(
      (await f.tasks.command("checklist", task.id, input, key, staffCtx, step.id)).version
    ).toBe(2);
    await expect(
      f.tasks.command("checklist", task.id, input, randomUUID(), staffCtx, task.checklist![1].id)
    ).rejects.toThrow("Task changed");
    await expect(
      f.tasks.command(
        "checklist",
        task.id,
        { version: task.version, completed: true },
        randomUUID(),
        staffCtx,
        randomUUID()
      )
    ).rejects.toThrow("Checklist item not found");
    task = await f.tasks.command(
      "checklist",
      task.id,
      { version: task.version, completed: true },
      randomUUID(),
      staffCtx,
      task.checklist![1].id
    );
    task = await f.tasks.command(
      "complete",
      task.id,
      { version: task.version },
      randomUUID(),
      staffCtx
    );
    expect(task.status).toBe("COMPLETED");
    await expect(
      f.tasks.command(
        "checklist",
        task.id,
        { version: task.version, completed: false },
        randomUUID(),
        staffCtx,
        step.id
      )
    ).rejects.toThrow("Reopen");
    task = await f.tasks.command(
      "reopen",
      task.id,
      { version: task.version },
      randomUUID(),
      staffCtx
    );
    expect(task.checklist?.every((s) => s.completed)).toBe(true);
    expect(
      await f.recurringRepo.get(f.ctx as { tenantId: string; workspaceId: string }, row.id)
    ).toEqual(snapshot);
  });
  it("publishes future edits without rewriting today, including an already generated occurrence", async () => {
    const row = await publish();
    const today = await command("generate", row);
    const plan = {
      ...row.plans[0],
      timezone: row.timezone,
      effectiveFrom: "2026-11-09",
      title: "Closing",
      steps: [{ id: randomUUID(), title: "Lock" }],
    };
    const { version: _version, ...fields } = plan;
    await expect(
      command("edit", row, { plan: { ...fields, effectiveFrom: "2026-11-08" } })
    ).rejects.toThrow("tomorrow");
    const edited = await command("edit", row, { plan: fields });
    expect((await command("generate", edited)).occurrences[0].taskIds).toEqual(
      today.occurrences[0].taskIds
    );
    expect(
      (await f.tasks.detail(today.occurrences[0].taskIds[0], f.ctx)).checklist?.[0].title
    ).toBe("Unlock reception");
    f.setNow("2026-11-09T00:00:00Z");
    const tomorrow = await command("generate", edited);
    expect(
      (
        await f.tasks.detail(
          tomorrow.occurrences.find((o) => o.localDate === "2026-11-09")!.taskIds[0],
          f.ctx
        )
      ).title
    ).toBe("Closing");
  });
  it("bounds catch-up at three local dates and deduplicates simultaneous scheduled runners", async () => {
    await publish();
    f.setNow("2026-11-15T23:30:00Z");
    const reports = await Promise.all([f.generation.run(), f.generation.run()]);
    expect(reports.reduce((n, r) => n + r.updatedCount, 0)).toBe(3);
    const tasks = (await f.tasks.list({}, f.ctx)).items;
    expect(tasks.map((t) => t.recurrence?.localDate).sort()).toEqual([
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
    ]);
    expect((await f.generation.run()).updatedCount).toBe(0);
  });
  it("records manual skips, pause intervals, tomorrow resume and permanent end without deleting tasks", async () => {
    let row = await publish();
    row = await command("skip", row, { localDate: "2026-11-08" });
    expect((await command("generate", row)).occurrences[0]).toMatchObject({
      state: "SKIPPED",
      reason: "MANUAL",
      taskIds: [],
    });
    row = await command("pause", row);
    f.setNow("2026-11-09T12:00:00Z");
    expect((await f.generation.run()).updatedCount).toBe(0);
    row = await command("resume", row);
    expect(
      (await command("generate", row)).occurrences.find((o) => o.localDate === "2026-11-09")?.reason
    ).toBe("PAUSED");
    f.setNow("2026-11-10T12:00:00Z");
    row = await command("generate", row);
    expect(row.occurrences.find((o) => o.localDate === "2026-11-10")?.taskIds).toHaveLength(1);
    row = await command("end", row);
    f.setNow("2026-11-11T12:00:00Z");
    expect((await f.generation.run()).updatedCount).toBe(0);
    await expect(command("generate", row)).rejects.toThrow("Ended");
    expect((await f.tasks.list({}, f.ctx)).items).toHaveLength(1);
  });
  it("skips inactive and unavailable assignees without disclosing private availability reasons", async () => {
    const row = await publish({ assigneeIds: [owner.id, other.id] });
    await f.usecase.command("archive", other.id, { version: other.version }, randomUUID(), f.ctx);
    await f.availability.save(
      owner.id,
      {
        version: 0,
        profileVersion: owner.version,
        pattern: {
          timezone: "Europe/Berlin",
          effectiveFrom: "2026-11-09",
          effectiveUntil: null,
          weeklyHours: [],
          exceptions: [],
        },
      },
      randomUUID(),
      f.ctx
    );
    f.setNow("2026-11-09T12:00:00Z");
    const result = await command("generate", row);
    expect(result.occurrences[0]).toMatchObject({
      reason: "NO_ELIGIBLE_ASSIGNEES",
      skippedAssignees: [
        { staffId: owner.id, reason: "NOT_AVAILABLE" },
        { staffId: other.id, reason: "INACTIVE" },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/private|exceptions|weeklyHours/);
  });
  it("revokes scheduler authority when the original publisher loses access", async () => {
    const row = await publish();
    await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: f.workspaceA, userId: f.manager } },
      data: { status: "DISABLED" },
    });
    const report = await f.generation.run();
    expect(report.errorCount).toBe(0);
    const marker = await f.taskRepo.transaction(
      { tenantId: f.tenantA, workspaceId: f.workspaceA },
      (tx) =>
        f.recurringRepo.occurrence(
          { tenantId: f.tenantA, workspaceId: f.workspaceA },
          row.id,
          "2026-11-08",
          tx
        )
    );
    expect(marker?.reason).toBe("PUBLISHER_ACCESS");
    expect(
      await prisma.extKv.count({
        where: {
          tenantId: f.tenantA,
          moduleId: "tasks",
          scope: `workspace:${f.workspaceA}:records`,
        },
      })
    ).toBe(0);
  });
  it("enforces management access, strict input and current workspace scope at HTTP entry points", async () => {
    const row = await publish();
    const get = (token: string, workspace: string, path = "") =>
      request(f.app.getHttpServer())
        .get(`/tasks/recurring${path}`)
        .set("Authorization", `Bearer ${token}`)
        .set("X-Workspace-Id", workspace);
    expect((await get("manager", f.workspaceA)).status).toBe(200);
    expect((await get("staff", f.workspaceA)).status).toBe(403);
    expect((await get("manager", f.workspaceA2, `/${row.id}`)).status).toBe(404);
    expect((await get("outsider", f.workspaceB, `/${row.id}`)).status).toBe(404);
    const response = await request(f.app.getHttpServer())
      .post(`/tasks/recurring/${row.id}/generate`)
      .set("Authorization", "Bearer manager")
      .set("X-Workspace-Id", f.workspaceA)
      .set("X-Idempotency-Key", randomUUID())
      .send({ version: 1, unknown: true });
    expect(response.status).toBe(400);
    expect((await get("manager", f.workspaceA)).headers["cache-control"]).toBe("private, no-store");
  });
  it("keeps installed-app authority on the command connection for direct and legacy wrapped transactions", async () => {
    const scope = { tenantId: f.tenantA, workspaceId: f.workspaceA };
    await expect(
      f.taskRepo.transaction(scope, async (tx) => {
        const client = getPrismaClient(prisma, tx);
        await client.tenantAppInstall.update({
          where: { tenantId_appId: { tenantId: f.tenantA, appId: "tasks" } },
          data: { enabled: false },
        });
        expect(
          (await f.appInstalls.listEnabledByTenant(f.tenantA, tx)).some(
            (app) => app.appId === "tasks"
          )
        ).toBe(false);
        const wrapped = {
          prisma: client,
        } as unknown as import("@corely/kernel").TransactionContext;
        expect(
          (await f.appInstalls.listEnabledByTenant(f.tenantA, wrapped)).some(
            (app) => app.appId === "tasks"
          )
        ).toBe(false);
        throw new Error("fixture rollback");
      })
    ).rejects.toThrow("fixture rollback");
    expect(
      (await f.appInstalls.listEnabledByTenant(f.tenantA)).some((app) => app.appId === "tasks")
    ).toBe(true);
  });
  it("records a DST gap explicitly and materializes the first folded due minute only once", async () => {
    f.setNow("2026-03-29T00:00:00Z");
    const spring = await publish({ effectiveFrom: "2026-03-29", dueTime: "02:30" });
    expect((await command("generate", spring)).occurrences[0]).toMatchObject({
      reason: "CLOCK_GAP",
      taskIds: [],
    });
    f.setNow("2026-10-25T00:00:00Z");
    const fall = await publish({ effectiveFrom: "2026-10-25", dueTime: "02:30" });
    const first = await command("generate", fall);
    f.setNow("2026-10-25T01:30:00Z");
    const second = await command("generate", fall);
    expect(second.occurrences[0].taskIds).toEqual(first.occurrences[0].taskIds);
    expect((await f.tasks.detail(first.occurrences[0].taskIds[0], f.ctx)).dueAt).toBe(
      "2026-10-25T00:30:00.000Z"
    );
  });
  it("rolls back all occurrence tasks, marker, audit and events on an atomic persistence failure", async () => {
    const row = await publish({ assigneeIds: [owner.id, other.id] });
    const baseline = await prisma.extKv.count({
      where: { tenantId: f.tenantA, moduleId: "tasks" },
    });
    const enqueue = f.outbox.enqueue.bind(f.outbox);
    vi.spyOn(f.outbox, "enqueue").mockImplementation((event, tx) =>
      event.eventType === "tasks.checklist.materialize"
        ? Promise.reject(new Error("fixture rollback"))
        : enqueue(event, tx)
    );
    await expect(command("generate", row)).rejects.toThrow("fixture rollback");
    vi.restoreAllMocks();
    expect(await prisma.extKv.count({ where: { tenantId: f.tenantA, moduleId: "tasks" } })).toBe(
      baseline
    );
    expect(
      await prisma.outboxEvent.count({
        where: { tenantId: f.tenantA, eventType: "tasks.task.create" },
      })
    ).toBe(0);
    expect((await command("generate", row)).occurrences[0].taskIds).toHaveLength(2);
  });
});
