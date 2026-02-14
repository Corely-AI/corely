import type { INestApplication } from "@nestjs/common";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import {
  createApiTestApp,
  createTestDb,
  seedDefaultTenant,
  stopSharedContainer,
} from "@corely/testkit";
import { HEADER_TENANT_ID, HEADER_WORKSPACE_ID } from "@shared/request-context";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("classes billing send-progress SSE (integration)", () => {
  let app: INestApplication;
  let server: Server;
  let db: PostgresTestDb;
  let tenantId: string;
  let workspaceId: string;
  let userId: string;

  const authedPost = (url: string) =>
    request(server)
      .post(url)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

  const authedGet = (url: string) =>
    request(server)
      .get(url)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

  beforeAll(async () => {
    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer() as Server;
  });

  beforeEach(async () => {
    await db.reset();
    const seed = await seedDefaultTenant(app);
    tenantId = seed.tenantId;
    workspaceId = seed.workspaceId;
    userId = seed.userId;
  });

  afterAll(async () => {
    await app.close();
    await db.down();
    await stopSharedContainer();
  });

  it("returns text/event-stream and emits progress event payload", async () => {
    const month = "2026-01";
    const runResponse = await authedPost("/classes/billing/runs").send({
      month,
      createInvoices: false,
      sendInvoices: false,
    });

    expect([200, 201]).toContain(runResponse.status);
    const billingRunId = runResponse.body.billingRun?.id as string;
    expect(billingRunId).toBeTruthy();

    const streamResponse = await authedGet(
      `/classes/billing/runs/${billingRunId}/send-progress/stream`
    ).set("Accept", "text/event-stream");

    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers["content-type"]).toContain("text/event-stream");
    expect(streamResponse.text).toContain("event: billing.invoice-send-progress");
    expect(streamResponse.text).toContain("data:");
  });
});
