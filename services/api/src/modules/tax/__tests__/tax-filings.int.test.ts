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

describe("Tax filings (API)", () => {
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

  it("GET /tax/vat/periods returns correct periods for 2025", async () => {
    const res = await request(server)
      .get("/tax/vat/periods?year=2025")
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2025);
    if (res.body.frequency === "monthly") {
      expect(res.body.periods.length).toBe(12);
      expect(res.body.periods[0].periodKey).toBe("2025-01");
      expect(res.body.periods[11].periodKey).toBe("2025-12");
    } else {
      expect(res.body.periods.length).toBe(4);
      expect(res.body.periods.map((p: { periodKey: string }) => p.periodKey)).toEqual([
        "2025-Q1",
        "2025-Q2",
        "2025-Q3",
        "2025-Q4",
      ]);
    }
  });

  it("GET /tax/filings filters by type=vat&year=2025&periodKey=2025-Q2", async () => {
    await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "VAT_ADVANCE",
        group: "ADVANCE_VAT",
        periodLabel: "Q2 2025",
        periodStart: new Date("2025-04-01T00:00:00.000Z"),
        periodEnd: new Date("2025-07-01T00:00:00.000Z"),
        dueDate: new Date("2025-07-10T00:00:00.000Z"),
        status: "OPEN",
        currency: "EUR",
      },
    });

    const res = await request(server)
      .get("/tax/filings?type=vat&year=2025&periodKey=2025-Q2")
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].periodKey).toBe("2025-Q2");
    expect(res.body.items[0].type).toBe("vat");
  });

  it("POST /tax/filings creates VAT and duplicate returns 409", async () => {
    const payload = {
      type: "vat",
      year: 2025,
      periodKey: "2025-Q2",
    };

    const first = await request(server)
      .post("/tax/filings")
      .send(payload)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(first.status).toBe(201);
    expect(first.body.id).toBeDefined();

    const duplicate = await request(server)
      .post("/tax/filings")
      .send(payload)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(duplicate.status).toBe(409);
  });

  it("GET /tax/filings/:id returns detail with capabilities", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-12-31T00:00:00.000Z"),
        dueDate: new Date("2026-05-31T00:00:00.000Z"),
        status: "OPEN",
        currency: "EUR",
        meta: { issues: [] },
      } as any,
    });

    const res = await request(server)
      .get(`/tax/filings/${report.id}`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.filing.id).toBe(report.id);
    expect(res.body.filing.capabilities).toBeDefined();
  });

  it("POST /tax/filings/:id/submit blocked when blocker issues exist", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-12-31T00:00:00.000Z"),
        dueDate: new Date("2026-05-31T00:00:00.000Z"),
        status: "OPEN",
        currency: "EUR",
        meta: {
          issues: [
            {
              id: "issue-1",
              type: "uncategorized-expenses",
              severity: "blocker",
              title: "Uncategorized expenses",
            },
          ],
        },
      } as any,
    });

    const res = await request(server)
      .post(`/tax/filings/${report.id}/submit`)
      .send({
        method: "manual",
        submissionId: "SUB-123",
        submittedAt: new Date().toISOString(),
      })
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(409);
  });

  it("POST /tax/filings/:id/mark-paid only allowed from submitted", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-12-31T00:00:00.000Z"),
        dueDate: new Date("2026-05-31T00:00:00.000Z"),
        status: "OPEN",
        currency: "EUR",
      },
    });

    const blocked = await request(server)
      .post(`/tax/filings/${report.id}/mark-paid`)
      .send({
        paidAt: new Date().toISOString(),
        method: "manual",
        amountCents: 10000,
      })
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(blocked.status).toBe(409);

    await db.client.taxReport.update({
      where: { id: report.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    const allowed = await request(server)
      .post(`/tax/filings/${report.id}/mark-paid`)
      .send({
        paidAt: new Date().toISOString(),
        method: "manual",
        amountCents: 10000,
      })
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(allowed.status).toBe(200);
    expect(allowed.body.filing.status).toBe("paid");
  });

  it("GET /tax/filings/:id/items returns list and respects filters", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-12-31T00:00:00.000Z"),
        dueDate: new Date("2026-05-31T00:00:00.000Z"),
        status: "OPEN",
        currency: "EUR",
      },
    });

    await db.client.taxSnapshot.createMany({
      data: [
        {
          tenantId: workspaceId,
          sourceType: "INVOICE",
          sourceId: "inv-1",
          jurisdiction: "DE",
          regime: "STANDARD_VAT",
          roundingMode: "PER_DOCUMENT",
          currency: "EUR",
          calculatedAt: new Date("2025-06-01T00:00:00.000Z"),
          subtotalAmountCents: 10000,
          taxTotalAmountCents: 1900,
          totalAmountCents: 11900,
          breakdownJson: "{}",
        },
        {
          tenantId: workspaceId,
          sourceType: "EXPENSE",
          sourceId: "exp-1",
          jurisdiction: "DE",
          regime: "STANDARD_VAT",
          roundingMode: "PER_DOCUMENT",
          currency: "EUR",
          calculatedAt: new Date("2025-06-02T00:00:00.000Z"),
          subtotalAmountCents: 5000,
          taxTotalAmountCents: 950,
          totalAmountCents: 5950,
          breakdownJson: "{}",
        },
      ],
      skipDuplicates: true,
    });

    const res = await request(server)
      .get(`/tax/filings/${report.id}/items?sourceType=income&page=1&pageSize=20`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].sourceType).toBe("income");
    expect(res.body.pageInfo).toBeDefined();
  });
});
