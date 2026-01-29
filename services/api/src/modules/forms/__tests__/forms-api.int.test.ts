import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EnvModule } from "@corely/config";
import { DataModule } from "@corely/data";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import {
  createRole,
  createTenant,
  createTestDb,
  createUser,
  linkMembership,
  stopSharedContainer,
} from "@corely/testkit";
import { KernelModule } from "../../../shared/kernel/kernel.module";
import { IdentityModule } from "../../identity";
import { PlatformModule } from "../../platform";
import { FormsModule } from "../forms.module";
import { JwtTokenService } from "../../identity/infrastructure/security/jwt.token-service";

vi.setConfig({ hookTimeout: 240_000, testTimeout: 240_000 });

describe("Forms API (HTTP + Postgres)", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;
  let tokenService: JwtTokenService;
  let tenantId: string;
  let userId: string;
  let roleId: string;

  beforeAll(async () => {
    db = await createTestDb();
    const moduleRef = await Test.createTestingModule({
      imports: [
        EnvModule.forTest({
          DATABASE_URL: db.url,
          WORKFLOW_QUEUE_DRIVER: "memory",
        }),
        DataModule,
        KernelModule,
        IdentityModule,
        PlatformModule,
        FormsModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer();
    tokenService = new JwtTokenService();
  });

  beforeEach(async () => {
    await db.reset();
    const prisma = db.client;
    const tenant = await createTenant(prisma, { name: "Tenant A" });
    tenantId = tenant.id;
    const role = await createRole(prisma, tenantId, { name: "Owner", systemKey: "OWNER" });
    roleId = role.id;
    const user = await createUser(prisma, { email: "owner@example.com" });
    userId = user.id;
    await linkMembership(prisma, { tenantId, userId, roleId });

    await prisma.rolePermissionGrant.createMany({
      data: [
        { tenantId, roleId, permissionKey: "forms.read", effect: "ALLOW" },
        { tenantId, roleId, permissionKey: "forms.manage", effect: "ALLOW" },
        { tenantId, roleId, permissionKey: "forms.submissions.read", effect: "ALLOW" },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
    await db.down();
    await stopSharedContainer();
  });

  const buildAuthHeader = (tenantIdInput: string) => {
    const token = tokenService.generateAccessToken({
      userId,
      email: "owner@example.com",
      tenantId: tenantIdInput,
      roleIds: [roleId],
    });
    return `Bearer ${token}`;
  };

  it("creates form, publishes, submits publicly, and lists submissions", async () => {
    const createRes = await request(server)
      .post("/forms")
      .set("authorization", buildAuthHeader(tenantId))
      .send({ name: "Customer Survey", description: "A simple survey" });

    expect([200, 201]).toContain(createRes.status);
    const formId = createRes.body.form?.id ?? createRes.body.id;
    expect(formId).toBeDefined();

    const fieldRes = await request(server)
      .post(`/forms/${formId}/fields`)
      .set("authorization", buildAuthHeader(tenantId))
      .send({
        label: "Email",
        type: "EMAIL",
        required: true,
      });

    expect([200, 201]).toContain(fieldRes.status);
    expect(fieldRes.body.form?.fields?.length).toBeGreaterThan(0);

    const publishRes = await request(server)
      .post(`/forms/${formId}/publish`)
      .set("authorization", buildAuthHeader(tenantId))
      .send({});

    expect([200, 201]).toContain(publishRes.status);
    const { publicId, token } = publishRes.body;
    expect(publicId).toBeDefined();
    expect(token).toBeDefined();

    const publicGet = await request(server).get(`/public/forms/${publicId}`);
    expect(publicGet.status).toBe(200);
    expect(publicGet.body.form?.name).toBe("Customer Survey");

    const submitRes = await request(server)
      .post(`/public/forms/${publicId}/submissions`)
      .send({ token, payload: { email: "test@example.com" } });

    expect([200, 201]).toContain(submitRes.status);
    expect(submitRes.body.submission?.id).toBeDefined();

    const listSubmissions = await request(server)
      .get(`/forms/${formId}/submissions?pageSize=10`)
      .set("authorization", buildAuthHeader(tenantId));

    expect(listSubmissions.status).toBe(200);
    expect(listSubmissions.body.items?.length).toBeGreaterThan(0);
    expect(listSubmissions.body.items[0].payloadJson.email).toBe("test@example.com");
  });
});
