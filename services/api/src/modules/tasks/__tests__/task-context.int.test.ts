import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "@corely/data";
import { isRestrictedDocumentId } from "@corely/domain";
import { EmployeeTaskSchema, TaskContextSchema, type StaffDirectoryEntry } from "@corely/contracts";
import { tasksFixture } from "./task-fixture";

const url = process.env.TASKS_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/tasks_test_[a-z0-9_]+(?:\?.*)?$/.test(url);

describe.skipIf(!enabled)("Task context, source access and replay", () => {
  let fixture: Awaited<ReturnType<typeof tasksFixture>>;
  let prisma: PrismaService;
  let assigned: StaffDirectoryEntry;
  const http = (
    method: "get" | "post",
    path: string,
    actor = "manager",
    workspace?: string,
    key = randomUUID()
  ) =>
    request(fixture.app.getHttpServer())
      [method]("/tasks" + path)
      .set("Authorization", "Bearer " + actor)
      .set("X-Workspace-Id", workspace ?? fixture.workspaceA)
      .set("X-Idempotency-Key", key);
  const create = async (title: string) =>
    EmployeeTaskSchema.parse(
      (await http("post", "").send({ title, ownerStaffId: assigned.id })).body
    );

  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    fixture = await tasksFixture(prisma);
    assigned = await fixture.usecase.command(
      "create",
      null,
      { displayName: "Synthetic staff", accountId: fixture.staff },
      randomUUID(),
      fixture.ctx
    );
  });
  afterAll(async () => {
    await fixture?.cleanup();
    await prisma?.onModuleDestroy();
  });

  it("shares comments and validated files only through the selected task", async () => {
    const task = await create("Shared task");
    const other = await create("Different task");
    const link = "/" + task.id + "/context";
    const key = randomUUID();
    const [first, replay] = await Promise.all([
      http("post", link + "/comments", "staff", undefined, key).send({ text: "Keys ready" }),
      http("post", link + "/comments", "staff", undefined, key).send({ text: "Keys ready" }),
    ]);
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(TaskContextSchema.parse(replay.body).comments).toHaveLength(1);
    expect((await http("get", link, "manager", fixture.workspaceA2)).status).toBe(404);

    const attachment = {
      filename: "checklist.pdf",
      contentType: "application/pdf",
      base64: Buffer.from("%PDF-1.7\n").toString("base64"),
    };
    const html = Buffer.from("<html>invalid</html>").toString("base64");
    expect((await http("post", link + "/files").send({ ...attachment, base64: html })).status).toBe(
      400
    );
    const uploaded = await http("post", link + "/files", "staff").send(attachment);
    expect(uploaded.status).toBe(201);
    const file = TaskContextSchema.parse(uploaded.body).files[0];
    expect(isRestrictedDocumentId(file.documentId)).toBe(true);
    const download = await http("get", link + "/files/" + file.documentId, "staff");
    expect(download.status).toBe(200);
    expect(download.headers["cache-control"]).toBe("private, no-store");
    expect(download.headers["x-content-type-options"]).toBe("nosniff");
    expect(download.headers["content-disposition"]).toContain("attachment");
    expect((await http("get", "/" + other.id + "/context/files/" + file.documentId)).status).toBe(
      404
    );
  });

  it("writes one auditable follow-up and removes the source identifier from a revoked projection", async () => {
    const source = { kind: "booking", id: fixture.sourceId };
    const body = { task: { title: "Review booking", ownerStaffId: assigned.id }, source };
    const key = randomUUID();
    expect(
      (await http("post", "/follow-up", "manager", fixture.workspaceA2, key).send(body)).status
    ).toBe(404);
    const first = await http("post", "/follow-up", "manager", undefined, key).send(body);
    const second = await http("post", "/follow-up", "manager", undefined, key).send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const task = EmployeeTaskSchema.parse(first.body);
    expect(EmployeeTaskSchema.parse(second.body).id).toBe(task.id);
    expect(
      await prisma.auditLog.count({
        where: { tenantId: fixture.tenantA, entityId: task.id, action: "tasks.context.follow-up" },
      })
    ).toBe(1);
    const link = "/" + task.id + "/context";
    const managerView = TaskContextSchema.parse((await http("get", link)).body);
    expect(managerView.sources).toEqual([{ ...source, status: "available" }]);
    const staffView = TaskContextSchema.parse((await http("get", link, "staff")).body);
    expect(staffView.sources).toEqual([{ kind: "booking", status: "unavailable" }]);
    fixture.revokeBookingSource();
    expect(TaskContextSchema.parse((await http("get", link)).body).sources).toEqual(
      staffView.sources
    );
    expect((await http("post", "/follow-up", "manager", undefined, key).send(body)).status).toBe(
      404
    );
  });
});
