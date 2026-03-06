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

describe("Tax income date basis (API)", () => {
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

  it("lists income-annual invoice items by payment date", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-12-31T23:59:59.000Z"),
        dueDate: new Date("2026-05-31T00:00:00.000Z"),
        status: "OPEN",
        currency: "EUR",
      },
    });

    const invoice = await db.client.invoice.create({
      data: {
        tenantId: workspaceId,
        customerPartyId: "party-income-date-1",
        number: "INV-INCOME-DATE-1",
        status: "PAID",
        currency: "EUR",
        billToName: "Income Customer",
        invoiceDate: new Date("2025-10-31T00:00:00.000Z"),
        issuedAt: new Date("2026-03-04T10:00:00.000Z"),
        taxSnapshot: {
          subtotalAmountCents: 9_000,
          taxTotalAmountCents: 1_710,
          totalAmountCents: 10_710,
          totalsByKind: {
            STANDARD: {
              taxAmountCents: 1_710,
            },
          },
        },
      },
    });
    await db.client.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        amountCents: 10_710,
        paidAt: new Date("2025-12-20T00:00:00.000Z"),
        note: "Bank transfer",
      },
    });

    const res = await request(server)
      .get(`/tax/filings/${report.id}/items?sourceType=invoice&page=1&pageSize=20`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].sourceId).toBe(invoice.id);
    expect(res.body.items[0].date).toBe("2025-12-20T00:00:00.000Z");
  });

  it("recalculate stores income invoice snapshot using final payment date", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-12-31T23:59:59.000Z"),
        dueDate: new Date("2026-05-31T00:00:00.000Z"),
        status: "OPEN",
        currency: "EUR",
      },
    });

    const invoice = await db.client.invoice.create({
      data: {
        tenantId: workspaceId,
        customerPartyId: "party-income-date-2",
        number: "INV-INCOME-DATE-2",
        status: "PAID",
        currency: "EUR",
        billToName: "Income Recalc Customer",
        invoiceDate: new Date("2025-09-15T00:00:00.000Z"),
        issuedAt: new Date("2026-03-04T12:00:00.000Z"),
        taxSnapshot: {
          subtotalAmountCents: 12_000,
          taxTotalAmountCents: 2_280,
          totalAmountCents: 14_280,
          totalsByKind: {
            STANDARD: {
              taxAmountCents: 2_280,
            },
          },
        },
      },
    });
    await db.client.invoicePayment.createMany({
      data: [
        {
          invoiceId: invoice.id,
          amountCents: 4_000,
          paidAt: new Date("2025-11-01T00:00:00.000Z"),
          note: "Part 1",
        },
        {
          invoiceId: invoice.id,
          amountCents: 10_280,
          paidAt: new Date("2025-12-28T00:00:00.000Z"),
          note: "Part 2",
        },
      ],
    });

    const recalc = await request(server)
      .post(`/tax/filings/${report.id}/recalculate`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(recalc.status).toBe(200);

    const snapshot = await db.client.taxSnapshot.findUnique({
      where: {
        tenantId_sourceType_sourceId: {
          tenantId: workspaceId,
          sourceType: "INVOICE",
          sourceId: invoice.id,
        },
      },
    });
    expect(snapshot).toBeTruthy();
    expect(snapshot?.calculatedAt.toISOString()).toBe("2025-12-28T00:00:00.000Z");
    expect(snapshot?.totalAmountCents).toBe(14_280);
  });
});
