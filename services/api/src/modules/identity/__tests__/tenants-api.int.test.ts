import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PostgresTestDb,
  createApiTestApp,
  createTestDb,
  seedDefaultTenant,
  stopSharedContainer,
} from "@corely/testkit";
import { PrismaService } from "@corely/data";
import bcrypt from "bcrypt";
import { RoleScope } from "@prisma/client";
import { PLATFORM_PERMISSION_KEYS } from "../application/policies/platform-permissions.policy";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Platform tenants API (E2E)", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;
  let prisma: PrismaService;

  beforeAll(async () => {
    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer();
    prisma = db.client;
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (db) await db.down();
    await stopSharedContainer();
  });

  const login = async (email: string, password: string, tenantId?: string | null) => {
    const res = await request(server).post("/auth/login").send({ email, password, tenantId });
    expect(res.status).toBe(201);
    return res.body.accessToken as string;
  };

  it("returns 403 for non-super-admins", async () => {
    const seed = await seedDefaultTenant(app);
    const token = await login("owner@example.com", "Password123!", seed.tenantId);

    const res = await request(server)
      .post("/platform/tenants")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Blocked Tenant", slug: "blocked-tenant" });

    expect(res.status).toBe(403);
  });

  it("creates a tenant for super admin", async () => {
    const password = "SuperAdminPass123!";
    const passwordHash = await bcrypt.hash(password, 10);

    const role = await prisma.role.create({
      data: {
        tenantId: null,
        name: "SuperAdmin",
        scope: RoleScope.HOST,
        systemKey: "SUPERADMIN",
        isSystem: true,
      },
    });

    await prisma.rolePermissionGrant.create({
      data: {
        tenantId: null,
        roleId: role.id,
        permissionKey: PLATFORM_PERMISSION_KEYS.tenants.write,
        effect: "ALLOW",
      },
    });

    const user = await prisma.user.create({
      data: {
        email: "superadmin@example.com",
        name: "Super Admin",
        passwordHash,
        status: "ACTIVE",
      },
    });

    await prisma.membership.create({
      data: {
        tenantId: null,
        userId: user.id,
        roleId: role.id,
      },
    });

    const token = await login("superadmin@example.com", password, null);

    const res = await request(server)
      .post("/platform/tenants")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Tenant", slug: "new-tenant" });

    expect(res.status).toBe(201);
    expect(res.body.tenant?.name).toBe("New Tenant");
    expect(res.body.tenant?.slug).toBe("new-tenant");
  });
});
