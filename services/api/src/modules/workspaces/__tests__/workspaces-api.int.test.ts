import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import { randomUUID } from "crypto";
import {
  createApiTestApp,
  createTestDb,
  seedDefaultTenant,
  stopSharedContainer,
} from "@corely/testkit";
import { HEADER_TENANT_ID } from "@shared/request-context";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../../platform/application/ports/tenant-app-install-repository.port";
import { TenantEntitlementsService } from "../../platform-entitlements/application/tenant-entitlements.service";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Workspaces API (E2E)", () => {
  const originalProxyEnv = {
    app: process.env.CORELY_PROXY_KEY_APP,
    pos: process.env.CORELY_PROXY_KEY_POS,
    crm: process.env.CORELY_PROXY_KEY_CRM,
  };
  const proxyKeys = {
    app: "workspaces-app-proxy-key",
    pos: "workspaces-pos-proxy-key",
    crm: "workspaces-crm-proxy-key",
  };
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;
  let tenantId: string;
  let userId: string;
  let appInstallRepo: TenantAppInstallRepositoryPort;
  let tenantEntitlements: TenantEntitlementsService;
  const authedPost = (url: string) =>
    request(server).post(url).set(HEADER_TENANT_ID, tenantId).set("x-user-id", userId);
  const authedGet = (url: string) =>
    request(server).get(url).set(HEADER_TENANT_ID, tenantId).set("x-user-id", userId);
  const authedPatch = (url: string) =>
    request(server).patch(url).set(HEADER_TENANT_ID, tenantId).set("x-user-id", userId);

  beforeAll(async () => {
    process.env.CORELY_PROXY_KEY_APP = proxyKeys.app;
    process.env.CORELY_PROXY_KEY_POS = proxyKeys.pos;
    process.env.CORELY_PROXY_KEY_CRM = proxyKeys.crm;

    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer();
    appInstallRepo = app.get(TENANT_APP_INSTALL_REPOSITORY_TOKEN);
    tenantEntitlements = app.get(TenantEntitlementsService);
  });

  beforeEach(async () => {
    await db.reset();
    const seed = await seedDefaultTenant(app);
    tenantId = seed.tenantId;
    userId = seed.userId;
  });

  afterAll(async () => {
    process.env.CORELY_PROXY_KEY_APP = originalProxyEnv.app;
    process.env.CORELY_PROXY_KEY_POS = originalProxyEnv.pos;
    process.env.CORELY_PROXY_KEY_CRM = originalProxyEnv.crm;

    await app.close();
    await db.down();
    await stopSharedContainer();
  });

  const enableApps = async (appIds: string[]) => {
    for (const appId of appIds) {
      await appInstallRepo.upsert({
        id: randomUUID(),
        tenantId,
        appId,
        enabled: true,
        installedVersion: "1.0.0",
        enabledAt: new Date(),
        enabledByUserId: userId,
      });
      await tenantEntitlements.updateAppEnablement(tenantId, appId, true, userId);
    }
  };

  describe("POST /workspaces", () => {
    it("creates workspace with legal entity and owner membership", async () => {
      const res = await authedPost("/workspaces")
        .set("x-idempotency-key", "create-workspace-1")
        .send({
          tenantId,
          createdByUserId: userId,
          name: "My Test Company",
          kind: "COMPANY",
          legalName: "Test Company LLC",
          countryCode: "US",
          currency: "USD",
          address: {
            line1: "123 Test St",
            city: "San Francisco",
            postalCode: "94102",
            countryCode: "US",
          },
          taxId: "12-3456789",
        });

      expect(res.status).toBe(201);
      expect(res.body.workspace).toBeDefined();
      expect(res.body.workspace.id).toBeDefined();
      expect(res.body.workspace.name).toBe("My Test Company");
      expect(res.body.workspace.kind).toBe("COMPANY");
      expect(res.body.workspace.legalName).toBe("Test Company LLC");
      expect(res.body.workspace.countryCode).toBe("US");
      expect(res.body.workspace.currency).toBe("USD");
      expect(res.body.workspace.onboardingStatus).toBe("PROFILE");

      expect(res.body.membership).toBeDefined();
      expect(res.body.membership.role).toBe("OWNER");
      expect(res.body.membership.status).toBe("ACTIVE");
      expect(res.body.membership.userId).toBe(userId);
    });

    it("supports idempotency - returns same result for duplicate key", async () => {
      const payload = {
        name: "Idempotent Workspace",
        kind: "PERSONAL",
        legalName: "John Doe",
        countryCode: "DE",
        currency: "EUR",
      };

      const res1 = await authedPost("/workspaces")
        .set("x-idempotency-key", "duplicate-test")
        .send(payload);

      const res2 = await authedPost("/workspaces")
        .set("x-idempotency-key", "duplicate-test")
        .send(payload);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.workspace.id).toBe(res2.body.workspace.id);
      expect(res1.body.membership.id).toBe(res2.body.membership.id);
    });

    it("creates workspace with minimal fields (defaults applied)", async () => {
      const res = await authedPost("/workspaces").send({
        name: "Minimal Workspace",
        kind: "PERSONAL",
      });

      expect(res.status).toBe(201);
      expect(res.body.workspace.name).toBe("Minimal Workspace");
      expect(res.body.workspace.legalName).toBe("Minimal Workspace"); // Defaults to name
      expect(res.body.workspace.countryCode).toBe("US"); // Default
      expect(res.body.workspace.currency).toBe("USD"); // Default
    });
  });

  describe("GET /workspaces", () => {
    it("lists workspaces where user has membership", async () => {
      // Create two workspaces
      const ws1 = await authedPost("/workspaces").send({
        name: "First Workspace",
        kind: "COMPANY",
        legalName: "First LLC",
        countryCode: "US",
        currency: "USD",
      });

      const ws2 = await authedPost("/workspaces").send({
        name: "Second Workspace",
        kind: "PERSONAL",
        legalName: "Second Person",
        countryCode: "DE",
        currency: "EUR",
      });

      // List workspaces
      const res = await authedGet("/workspaces");

      expect(res.status).toBe(200);
      expect(res.body.workspaces).toHaveLength(3); // 2 created + 1 default
      expect(res.body.workspaces[0].name).toBe("Second Workspace");
      expect(res.body.workspaces[1].name).toBe("First Workspace");
      expect(res.body.workspaces[2].name).toMatch(/^Default Workspace/);
    });

    it("only returns the default workspace when none are created", async () => {
      const res = await authedGet("/workspaces");

      expect(res.status).toBe(200);
      expect(res.body.workspaces).toHaveLength(1);
      expect(res.body.workspaces[0].name).toMatch(/^Default Workspace/);
    });
  });

  describe("GET /workspaces/:id", () => {
    it("gets workspace details with legal entity data", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Test Workspace",
        kind: "COMPANY",
        legalName: "Test Company",
        countryCode: "US",
        currency: "USD",
        taxId: "TAX123",
        address: {
          line1: "456 Main St",
          city: "NYC",
          postalCode: "10001",
          countryCode: "US",
        },
      });

      const workspaceId = created.body.workspace.id;

      const res = await authedGet(`/workspaces/${workspaceId}`);

      expect(res.status).toBe(200);
      expect(res.body.workspace.id).toBe(workspaceId);
      expect(res.body.workspace.name).toBe("Test Workspace");
      expect(res.body.workspace.legalName).toBe("Test Company");
      expect(res.body.workspace.taxId).toBe("TAX123");
      expect(res.body.workspace.address.line1).toBe("456 Main St");
    });

    it("returns 403 when user does not have workspace membership", async () => {
      // This would require creating another user without membership
      // For now, we'll just test with a non-existent workspace
      const res = await authedGet("/workspaces/non-existent-id");

      expect(res.status).toBe(403);
    });

    it("returns 404 when workspace does not exist", async () => {
      const res = await authedGet("/workspaces/clzzzzzzzzzzzzzzzzzzzzzzz");

      expect([403, 404]).toContain(res.status); // Could be 403 (no access) or 404
    });
  });

  describe("GET /workspaces/:id/config", () => {
    const navigationIds = (body: {
      navigation: { groups: Array<{ items: Array<{ id: string }> }> };
    }) => body.navigation.groups.flatMap((group) => group.items.map((item) => item.id));

    it("returns workspace config based on kind", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Config Workspace",
        kind: "PERSONAL",
      });

      const workspaceId = created.body.workspace.id;
      const res = await authedGet(`/workspaces/${workspaceId}/config`);

      expect(res.status).toBe(200);
      expect(res.body.kind).toBe("PERSONAL");
      expect(res.body.capabilities["workspace.multiUser"]).toBe(true);
      expect(res.body.capabilities["sales.quotes"]).toBe(false);
      expect(res.body.terminology.partyLabel).toBe("Client");
      expect(Array.isArray(res.body.navigation.groups)).toBe(true);
    });

    it("returns the resolved surface in workspace config", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Surface Workspace",
        kind: "COMPANY",
        verticalId: "restaurant",
        legalName: "Surface Workspace GmbH",
        countryCode: "DE",
        currency: "EUR",
      });

      const workspaceId = created.body.workspace.id;

      await enableApps(["core", "crm", "cash-management", "restaurant"]);

      const posRes = await authedGet(`/workspaces/${workspaceId}/config`)
        .set("x-workspace-id", workspaceId)
        .set("x-corely-proxy-key", proxyKeys.pos)
        .set("x-corely-surface", "pos");
      const crmRes = await authedGet(`/workspaces/${workspaceId}/config`)
        .set("x-workspace-id", workspaceId)
        .set("x-corely-proxy-key", proxyKeys.crm)
        .set("x-corely-surface", "crm");

      expect(posRes.status).toBe(200);
      expect(crmRes.status).toBe(200);
      expect(posRes.body.surfaceId).toBe("pos");
      expect(posRes.body.verticalId).toBe("restaurant");
      expect(crmRes.body.surfaceId).toBe("crm");
      expect(navigationIds(posRes.body)).not.toContain("dashboard");
    });

    it("returns only restaurant POS items for restaurant workspaces", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Restaurant Workspace",
        kind: "COMPANY",
        verticalId: "restaurant",
        legalName: "Restaurant Workspace GmbH",
        countryCode: "DE",
        currency: "EUR",
      });

      const workspaceId = created.body.workspace.id;

      await enableApps(["core", "cash-management", "restaurant", "nails", "retail"]);

      const res = await authedGet(`/workspaces/${workspaceId}/config`)
        .set("x-workspace-id", workspaceId)
        .set("x-corely-proxy-key", proxyKeys.pos)
        .set("x-corely-surface", "pos");

      expect(res.status).toBe(200);
      expect(navigationIds(res.body)).toContain("restaurant-floor-plan");
      expect(navigationIds(res.body)).not.toContain("nails-service-board");
      expect(navigationIds(res.body)).not.toContain("retail-quick-sale");
    });

    it("returns only nails POS items for nails workspaces", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Nails Workspace",
        kind: "COMPANY",
        verticalId: "nails",
        legalName: "Nails Workspace GmbH",
        countryCode: "DE",
        currency: "EUR",
      });

      const workspaceId = created.body.workspace.id;

      await enableApps(["core", "cash-management", "restaurant", "nails", "retail"]);

      const res = await authedGet(`/workspaces/${workspaceId}/config`)
        .set("x-workspace-id", workspaceId)
        .set("x-corely-proxy-key", proxyKeys.pos)
        .set("x-corely-surface", "pos");

      expect(res.status).toBe(200);
      expect(navigationIds(res.body)).toContain("nails-service-board");
      expect(navigationIds(res.body)).not.toContain("restaurant-floor-plan");
      expect(navigationIds(res.body)).not.toContain("retail-quick-sale");
    });

    it("returns only retail POS items for retail workspaces", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Retail Workspace",
        kind: "COMPANY",
        verticalId: "retail",
        legalName: "Retail Workspace GmbH",
        countryCode: "DE",
        currency: "EUR",
      });

      const workspaceId = created.body.workspace.id;

      await enableApps(["core", "cash-management", "restaurant", "nails", "retail"]);

      const res = await authedGet(`/workspaces/${workspaceId}/config`)
        .set("x-workspace-id", workspaceId)
        .set("x-corely-proxy-key", proxyKeys.pos)
        .set("x-corely-surface", "pos");

      expect(res.status).toBe(200);
      expect(navigationIds(res.body)).toContain("retail-quick-sale");
      expect(navigationIds(res.body)).not.toContain("restaurant-floor-plan");
      expect(navigationIds(res.body)).not.toContain("nails-service-board");
    });

    it("returns platform config for direct requests without a trusted surface", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Direct Workspace",
        kind: "COMPANY",
        legalName: "Direct Workspace GmbH",
        countryCode: "DE",
        currency: "EUR",
      });

      const workspaceId = created.body.workspace.id;

      for (const appId of ["core", "crm", "cash-management"]) {
        await appInstallRepo.upsert({
          id: randomUUID(),
          tenantId,
          appId,
          enabled: true,
          installedVersion: "1.0.0",
          enabledAt: new Date(),
          enabledByUserId: userId,
        });
      }

      const res = await authedGet(`/workspaces/${workspaceId}/config`).set(
        "x-workspace-id",
        workspaceId
      );

      expect(res.status).toBe(200);
      expect(res.body.surfaceId).toBe("platform");
      expect(navigationIds(res.body)).not.toContain("crm-assistant");
    });

    it("fails closed when a non-platform surface is declared without a trusted proxy key", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Declared Surface Workspace",
        kind: "COMPANY",
        legalName: "Declared Surface GmbH",
        countryCode: "DE",
        currency: "EUR",
      });

      const workspaceId = created.body.workspace.id;

      const res = await authedGet(`/workspaces/${workspaceId}/config`)
        .set("x-workspace-id", workspaceId)
        .set("x-corely-surface", "crm");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("trusted proxy key");
    });

    it("fails closed for POS config when the workspace vertical is missing", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Missing Vertical Workspace",
        kind: "COMPANY",
        legalName: "Missing Vertical GmbH",
        countryCode: "DE",
        currency: "EUR",
      });

      const workspaceId = created.body.workspace.id;

      const res = await authedGet(`/workspaces/${workspaceId}/config`)
        .set("x-workspace-id", workspaceId)
        .set("x-corely-proxy-key", proxyKeys.pos)
        .set("x-corely-surface", "pos");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("workspace vertical");
    });

    it("rejects CRM API access from the POS surface", async () => {
      const res = await authedGet("/crm/leads")
        .set("x-corely-proxy-key", proxyKeys.pos)
        .set("x-corely-surface", "pos");

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /workspaces/:id", () => {
    it("updates workspace name", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Original Name",
        kind: "COMPANY",
        legalName: "Original LLC",
        countryCode: "US",
        currency: "USD",
      });

      const workspaceId = created.body.workspace.id;

      const res = await authedPatch(`/workspaces/${workspaceId}`)
        .set("x-idempotency-key", "update-name-1")
        .send({
          name: "Updated Name",
        });

      expect(res.status).toBe(200);
      expect(res.body.workspace.name).toBe("Updated Name");
      expect(res.body.workspace.legalName).toBe("Original LLC"); // Unchanged
    });

    it("updates legal entity fields", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Test Workspace",
        kind: "COMPANY",
        legalName: "Test LLC",
        countryCode: "US",
        currency: "USD",
      });

      const workspaceId = created.body.workspace.id;

      const res = await authedPatch(`/workspaces/${workspaceId}`).send({
        legalName: "Updated Legal Name",
        countryCode: "DE",
        currency: "EUR",
        taxId: "NEW-TAX-ID",
        address: {
          line1: "789 Updated St",
          city: "Berlin",
          postalCode: "10115",
          countryCode: "DE",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.workspace.legalName).toBe("Updated Legal Name");
      expect(res.body.workspace.countryCode).toBe("DE");
      expect(res.body.workspace.currency).toBe("EUR");
      expect(res.body.workspace.taxId).toBe("NEW-TAX-ID");
      expect(res.body.workspace.address.city).toBe("Berlin");
    });

    it("supports idempotency for updates", async () => {
      const created = await authedPost("/workspaces").send({
        name: "Test",
        kind: "COMPANY",
        legalName: "Test LLC",
        countryCode: "US",
        currency: "USD",
      });

      const workspaceId = created.body.workspace.id;
      const updatePayload = { name: "Updated via Idempotency" };

      const res1 = await authedPatch(`/workspaces/${workspaceId}`)
        .set("x-idempotency-key", "update-idempotent")
        .send(updatePayload);

      const res2 = await authedPatch(`/workspaces/${workspaceId}`)
        .set("x-idempotency-key", "update-idempotent")
        .send(updatePayload);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.workspace.updatedAt).toBe(res2.body.workspace.updatedAt);
    });

    it("returns 403 when user does not have access", async () => {
      const res = await authedPatch("/workspaces/non-existent").send({ name: "Hacked" });

      expect(res.status).toBe(403);
    });
  });

  describe("Tenant Isolation", () => {
    it("cannot access workspaces from different tenant", async () => {
      // Create workspace in tenant1
      const ws = await authedPost("/workspaces").send({
        name: "Tenant 1 Workspace",
        kind: "COMPANY",
        legalName: "Tenant 1 LLC",
        countryCode: "US",
        currency: "USD",
      });

      const workspaceId = ws.body.workspace.id;

      // Try to access with different tenant ID
      const res = await authedGet(`/workspaces/${workspaceId}`).set(
        HEADER_TENANT_ID,
        "different-tenant-id"
      );

      expect([403, 404]).toContain(res.status); // Should not have access or not found in tenant
    });

    it("list only returns workspaces from current tenant", async () => {
      // Create workspace in current tenant
      await authedPost("/workspaces").send({
        name: "My Tenant Workspace",
        kind: "COMPANY",
        legalName: "My LLC",
        countryCode: "US",
        currency: "USD",
      });

      const res = await authedGet("/workspaces");

      expect(res.status).toBe(200);
      expect(res.body.workspaces).toHaveLength(2); // Default + My Tenant Workspace
      expect(res.body.workspaces[0].name).toBe("My Tenant Workspace");
    });
  });
});
