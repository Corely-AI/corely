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

describe("VAT periods (API)", () => {
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

    const workspace = await db.client.workspace.findFirst({ where: { tenantId } });
    workspaceId = workspace!.id;
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

  it("includes December payments in 2025-Q4 details with positive tax due", async () => {
    const invoice = await db.client.invoice.create({
      data: {
        tenantId: workspaceId,
        customerPartyId: "party-1",
        billToName: "Acme GmbH",
        status: "PAID",
        currency: "EUR",
        issuedAt: new Date("2025-12-15T00:00:00Z"),
        invoiceDate: new Date("2025-12-15"),
        taxSnapshot: {
          subtotalAmountCents: 10_000,
          taxTotalAmountCents: 1_900,
          totalAmountCents: 11_900,
        },
      },
    });

    const payment = await db.client.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        amountCents: 11_900,
        paidAt: new Date("2025-12-20T00:00:00Z"),
      },
    });

    const res = await request(server)
      .get("/tax/periods/2025-Q4/details")
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.taxDueCents).toBeGreaterThan(0);
    expect(res.body.rows.some((row: any) => row.sourceId === payment.id)).toBe(true);
  });
});
