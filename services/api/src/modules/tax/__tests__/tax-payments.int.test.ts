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

describe("Tax payments (API)", () => {
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

  it("GET /tax/payments derives due/overdue/paid status", async () => {
    const now = new Date();
    const futureDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const pastDue = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    await db.client.taxReport.createMany({
      data: [
        {
          tenantId: workspaceId,
          type: "VAT_ADVANCE",
          group: "ADVANCE_VAT",
          periodLabel: "Q1 2025",
          periodStart: new Date("2025-01-01T00:00:00.000Z"),
          periodEnd: new Date("2025-04-01T00:00:00.000Z"),
          dueDate: futureDue,
          status: "SUBMITTED",
          amountFinalCents: 12000,
          currency: "EUR",
        },
        {
          tenantId: workspaceId,
          type: "INCOME_TAX",
          group: "ANNUAL_REPORT",
          periodLabel: "2025",
          periodStart: new Date("2025-01-01T00:00:00.000Z"),
          periodEnd: new Date("2025-12-31T00:00:00.000Z"),
          dueDate: pastDue,
          status: "SUBMITTED",
          amountFinalCents: 50000,
          currency: "EUR",
        },
        {
          tenantId: workspaceId,
          type: "INCOME_TAX",
          group: "ANNUAL_REPORT",
          periodLabel: "2024",
          periodStart: new Date("2024-01-01T00:00:00.000Z"),
          periodEnd: new Date("2024-12-31T00:00:00.000Z"),
          dueDate: pastDue,
          status: "PAID",
          amountFinalCents: 8000,
          currency: "EUR",
          meta: {
            payment: {
              paidAt: new Date().toISOString(),
              method: "manual",
              amountCents: 8000,
            },
          },
        },
      ],
    });

    const res = await request(server)
      .get("/tax/payments")
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    const statuses = res.body.items.map((item: { paymentStatus: string }) => item.paymentStatus);
    expect(statuses).toContain("due");
    expect(statuses).toContain("overdue");
    expect(statuses).toContain("paid");
  });

  it("GET /tax/payments filters by year and type", async () => {
    await db.client.taxReport.createMany({
      data: [
        {
          tenantId: workspaceId,
          type: "VAT_ADVANCE",
          group: "ADVANCE_VAT",
          periodLabel: "Q2 2025",
          periodStart: new Date("2025-04-01T00:00:00.000Z"),
          periodEnd: new Date("2025-07-01T00:00:00.000Z"),
          dueDate: new Date("2025-07-10T00:00:00.000Z"),
          status: "SUBMITTED",
          amountFinalCents: 12000,
          currency: "EUR",
        },
        {
          tenantId: workspaceId,
          type: "INCOME_TAX",
          group: "ANNUAL_REPORT",
          periodLabel: "2024",
          periodStart: new Date("2024-01-01T00:00:00.000Z"),
          periodEnd: new Date("2024-12-31T00:00:00.000Z"),
          dueDate: new Date("2025-05-31T00:00:00.000Z"),
          status: "SUBMITTED",
          amountFinalCents: 50000,
          currency: "EUR",
        },
      ],
    });

    const res = await request(server)
      .get("/tax/payments?year=2025&type=vat")
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].filingType).toBe("vat");
    expect(res.body.items[0].periodLabel).toBe("Q2 2025");
  });

  it("POST /tax/filings/:id/mark-paid updates payments list", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-12-31T00:00:00.000Z"),
        dueDate: new Date("2026-05-31T00:00:00.000Z"),
        status: "SUBMITTED",
        currency: "EUR",
      },
    });

    const markPaid = await request(server)
      .post(`/tax/filings/${report.id}/mark-paid`)
      .send({
        paidAt: new Date().toISOString(),
        method: "manual",
        amountCents: 10000,
      })
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(markPaid.status).toBe(200);

    const res = await request(server)
      .get("/tax/payments?status=paid")
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].paymentStatus).toBe("paid");
    expect(res.body.items[0].paidAt).toBeDefined();
  });

  it("POST /tax/filings/:id/payment-proof attaches receipt for paid filing", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2024",
        periodStart: new Date("2024-01-01T00:00:00.000Z"),
        periodEnd: new Date("2024-12-31T00:00:00.000Z"),
        dueDate: new Date("2025-05-31T00:00:00.000Z"),
        status: "PAID",
        currency: "EUR",
        meta: {
          payment: {
            paidAt: new Date().toISOString(),
            method: "manual",
            amountCents: 20000,
          },
        },
      },
    });

    const document = await db.client.document.create({
      data: {
        tenantId: workspaceId,
        type: "UPLOAD",
        status: "READY",
      },
    });

    const res = await request(server)
      .post(`/tax/filings/${report.id}/payment-proof`)
      .send({ proofDocumentId: document.id })
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.filing.payment.proofDocumentId).toBe(document.id);

    const link = await db.client.documentLink.findFirst({
      where: { documentId: document.id, entityId: report.id, entityType: "OTHER" },
    });
    expect(link).toBeTruthy();
  });
});
