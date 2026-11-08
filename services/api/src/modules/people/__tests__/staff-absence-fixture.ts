import { afterEach, beforeEach, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { PrismaService } from "@corely/data";
import type { ObjectStoragePort } from "@corely/kernel";
import { mockDeep } from "vitest-mock-extended";
import { staffFixture } from "./staff-fixture";
const url = process.env.PEOPLE_TEST_DATABASE_URL;
export const absenceTestsEnabled =
  !!url && /^postgres(?:ql)?:\/\/[^/]+\/people_test_[a-z0-9_]+(?:\?.*)?$/.test(url);

export function absenceTestFixture() {
  let prisma: PrismaService;
  let f: Awaited<ReturnType<typeof staffFixture>>;
  let now: Date, staffId: string;
  const storage = mockDeep<ObjectStoragePort>();
  const objects = new Map<string, Buffer>();
  const base = () => `/people/staff/${staffId}/absences`;
  const get = (path = base(), token = "manager", workspace?: string) =>
    request(f.app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", workspace ?? f.workspaceA);
  const post = (
    path: string,
    body: object,
    key = randomUUID(),
    token = "manager",
    workspace?: string
  ) =>
    request(f.app.getHttpServer())
      .post(path)
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", workspace ?? f.workspaceA)
      .set("X-Idempotency-Key", key)
      .send(body);
  const fields = (start = "2026-11-09T09:00:00Z", end = "2026-11-09T10:00:00Z") => ({
    range: { kind: "partial-day", timezone: "Europe/Berlin", startAt: start, endAt: end },
    reason: "synthetic-private-reason",
    notes: "synthetic-private-notes",
  });
  const create = async (body = fields()) => {
    const response = await post(base(), body);
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body;
  };
  const grant = (roleId: string, permissionKey: string, effect: "ALLOW" | "DENY" = "ALLOW") =>
    prisma.rolePermissionGrant.upsert({
      where: { tenantId_roleId_permissionKey: { tenantId: f.tenantA, roleId, permissionKey } },
      create: { tenantId: f.tenantA, roleId, permissionKey, effect },
      update: { effect },
    });
  const upload = (id: string, key = randomUUID(), token = "manager", workspace?: string) =>
    post(
      `${base()}/${id}/attachments`,
      {
        version: 1,
        filename: "example.txt",
        contentType: "text/plain",
        base64: Buffer.from("synthetic private file bytes").toString("base64"),
      },
      key,
      token,
      workspace
    );
  beforeEach(async () => {
    if (!url || !absenceTestsEnabled) {
      throw new Error("Disposable People database required");
    }
    process.env.DATABASE_URL = url;
    now = new Date("2026-11-08T12:00:00Z");
    vi.resetAllMocks();
    objects.clear();
    storage.provider.mockReturnValue("gcs");
    storage.bucket.mockReturnValue("synthetic-private-bucket");
    storage.putObject.mockImplementation(async ({ objectKey, bytes }) => {
      objects.set(objectKey, bytes);
      return { sizeBytes: bytes.length };
    });
    storage.getObject.mockImplementation(async ({ objectKey }) => {
      const bytes = objects.get(objectKey);
      if (!bytes) {
        throw new Error("Missing object");
      }
      return bytes;
    });
    prisma = new PrismaService();
    await prisma.$connect();
    f = await staffFixture(prisma, { now: () => now }, storage);
    staffId = (
      await f.usecase.command(
        "create",
        null,
        { displayName: "Synthetic staff", resourceId: f.resource.id },
        randomUUID(),
        f.ctx
      )
    ).id;
    await f.availability.save(
      staffId,
      {
        version: 0,
        profileVersion: 1,
        pattern: {
          timezone: "Europe/Berlin",
          effectiveFrom: "2026-11-09",
          effectiveUntil: null,
          weeklyHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }],
          exceptions: [],
        },
      },
      randomUUID(),
      f.ctx
    );
  });
  afterEach(async () => {
    await f?.cleanup();
    await prisma?.onModuleDestroy();
  });
  return {
    get current() {
      return { prisma, f, now, staffId, storage, base, get, post, fields, create, grant, upload };
    },
    setClock(value: Date) {
      now = value;
    },
  };
}
