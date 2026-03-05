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

describe("Tax annual income sections (API)", () => {
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

  it("upserts and reads annual income section for an income filing", async () => {
    const report = await db.client.taxReport.create({
      data: {
        tenantId: workspaceId,
        type: "INCOME_TAX",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00.000Z"),
        periodEnd: new Date("2025-12-31T00:00:00.000Z"),
        dueDate: new Date("2026-07-31T00:00:00.000Z"),
        status: "OPEN",
        currency: "EUR",
      },
    });

    const payload = {
      payload: {
        noIncomeFlag: false,
        incomeSources: [
          {
            type: "employment",
            label: "Main employer",
            payer: "Corely GmbH",
            country: "DE",
            amounts: {
              grossIncome: 100000,
              taxesWithheld: 15000,
            },
            attachments: {
              documentIds: ["doc-1", "doc-2"],
            },
          },
        ],
      },
    };

    const upsertRes = await request(server)
      .put(`/tax/filings/${report.id}/reports/${report.id}/sections/annual-income`)
      .send(payload)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(upsertRes.status).toBe(200);
    expect(upsertRes.body.section.reportId).toBe(report.id);
    expect(upsertRes.body.section.reportType).toBe("annual_income_report");
    expect(upsertRes.body.section.isComplete).toBe(true);
    expect(upsertRes.body.report.type).toBe("annual_income_report");

    const detailRes = await request(server)
      .get(`/tax/filings/${report.id}`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.filing.reports).toBeDefined();
    expect(detailRes.body.filing.reports[0].type).toBe("annual_income_report");

    const getSectionRes = await request(server)
      .get(`/tax/filings/${report.id}/reports/${report.id}/sections/annual-income`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(getSectionRes.status).toBe(200);
    expect(getSectionRes.body.section.payload.annualIncome.incomeSources).toHaveLength(1);
    expect(getSectionRes.body.section.payload.annualIncome.incomeSources[0].label).toBe(
      "Main employer"
    );
  });
});
