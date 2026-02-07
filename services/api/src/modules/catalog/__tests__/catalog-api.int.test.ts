import type { INestApplication } from "@nestjs/common";
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

vi.setConfig({ hookTimeout: 300_000, testTimeout: 300_000 });

describe("Catalog API", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;
  let tenantId: string;
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await db.reset();
    const seed = await seedDefaultTenant(app);
    tenantId = seed.tenantId;
    userId = seed.userId;
    workspaceId = (await db.client.workspace.findFirst({ where: { tenantId } }))!.id;

    await db.client.catalogUom.create({
      data: {
        id: "uom-1",
        tenantId,
        workspaceId,
        code: "PCS",
        name: "Pieces",
      },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (db) {
      await db.down();
    }
    await stopSharedContainer();
  });

  it("create -> list -> update -> archive item", async () => {
    const createRes = await request(server)
      .post("/catalog/items")
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId)
      .send({
        code: "sku-001",
        name: "Catalog Item",
        type: "PRODUCT",
        defaultUomId: "uom-1",
        requiresLotTracking: false,
        requiresExpiryDate: false,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.item.code).toBe("SKU-001");

    const listRes = await request(server)
      .get("/catalog/items?page=1&pageSize=20")
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBe(1);

    const itemId = createRes.body.item.id as string;
    const updateRes = await request(server)
      .patch(`/catalog/items/${itemId}`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId)
      .send({
        patch: {
          name: "Catalog Item Updated",
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.name).toBe("Catalog Item Updated");

    const archiveRes = await request(server)
      .post(`/catalog/items/${itemId}/archive`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(archiveRes.status).toBe(201);
    expect(archiveRes.body.item.status).toBe("ARCHIVED");
  });
});
