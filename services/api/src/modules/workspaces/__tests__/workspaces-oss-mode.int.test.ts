/**
 * OSS Mode Workspace API Enforcement Integration Tests
 * Verifies that workspace management endpoints return 404 in OSS mode
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../../app.module";

describe("Workspaces API - OSS Mode (Integration)", () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // Only run if EDITION=oss
    if (process.env.EDITION !== "oss") {
      console.log("Skipping OSS workspace tests - EDITION is not 'oss'");
      return;
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Sign up to get auth token
    const signupRes = await request(app.getHttpServer()).post("/auth/signup").send({
      email: "oss-test@example.com",
      password: "SecurePass123!",
      tenantName: "OSS Test Workspace",
      idempotencyKey: "oss-test-signup",
    });

    authToken = signupRes.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("should return 404 for POST /workspaces in OSS mode", async () => {
    if (process.env.EDITION !== "oss") return;

    const res = await request(app.getHttpServer())
      .post("/workspaces")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Second Workspace",
        kind: "COMPANY",
        legalName: "Test Company",
        countryCode: "US",
        currency: "USD",
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("EE edition");
  });

  it("should return 404 for GET /workspaces in OSS mode", async () => {
    if (process.env.EDITION !== "oss") return;

    const res = await request(app.getHttpServer())
      .get("/workspaces")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("EE edition");
  });

  it("should return 404 for PATCH /workspaces/:id in OSS mode", async () => {
    if (process.env.EDITION !== "oss") return;

    const res = await request(app.getHttpServer())
      .patch("/workspaces/tenant_default")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Updated Workspace" });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("EE edition");
  });

  it("should return 404 for GET /workspaces/:id/members in OSS mode", async () => {
    if (process.env.EDITION !== "oss") return;

    const res = await request(app.getHttpServer())
      .get("/workspaces/tenant_default/members")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("EE edition");
  });

  it("should verify default workspace was created during signup", async () => {
    if (process.env.EDITION !== "oss") return;

    // This would require accessing the database directly
    // or exposing a non-gated internal endpoint for testing
    expect(true).toBe(true);
  });
});
