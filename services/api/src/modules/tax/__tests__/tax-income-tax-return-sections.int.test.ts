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

describe("Income tax return sections (API)", () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication["getHttpServer"]>;
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

  it("persists explicit wizard sections and mirrors the new income section to legacy annual income", async () => {
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

    const personalDetailsPayload = {
      payload: {
        firstName: "Ada",
        lastName: "Lovelace",
        city: "Berlin",
        zipCode: "10115",
        civilStatus: "married",
        declarationType: "joint",
        gender: "female",
        religion: "--",
        spouseDifferentHomeAddress: "no",
      },
    };

    const upsertPersonalDetailsRes = await request(server)
      .put(`/tax/filings/${report.id}/reports/${report.id}/sections/personalDetails`)
      .send(personalDetailsPayload)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(upsertPersonalDetailsRes.status).toBe(200);
    expect(upsertPersonalDetailsRes.body.section.payload.personalDetails.firstName).toBe("Ada");

    const incomePayload = {
      payload: {
        annualIncome: {
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
                socialContributions: 5000,
                expensesRelated: 1000,
              },
              attachments: {
                documentIds: ["doc-1"],
              },
            },
          ],
        },
        hasEmploymentIncome: "yes",
        spouseHasEmploymentIncome: "no",
        hasUnemploymentBenefits: "no",
        spouseHasUnemploymentBenefits: "no",
        hasIncomeAbroad: "no",
        livedOutsideGermany: "no",
        spouseLivedOutsideGermany: "no",
        hasInvestmentIncome: "no",
        spouseHasSelfEmploymentIncome: "no",
      },
    };

    const upsertIncomeRes = await request(server)
      .put(`/tax/filings/${report.id}/reports/${report.id}/sections/income`)
      .send(incomePayload)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(upsertIncomeRes.status).toBe(200);
    expect(upsertIncomeRes.body.section.payload.income.hasEmploymentIncome).toBe("yes");
    expect(upsertIncomeRes.body.section.payload.income.annualIncome.incomeSources).toHaveLength(1);

    const getIncomeRes = await request(server)
      .get(`/tax/filings/${report.id}/reports/${report.id}/sections/income`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(getIncomeRes.status).toBe(200);
    expect(getIncomeRes.body.section.payload.income.hasEmploymentIncome).toBe("yes");
    expect(getIncomeRes.body.section.payload.income.annualIncome.incomeSources[0].label).toBe(
      "Main employer"
    );

    const getLegacyAnnualIncomeRes = await request(server)
      .get(`/tax/filings/${report.id}/reports/${report.id}/sections/annual-income`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(getLegacyAnnualIncomeRes.status).toBe(200);
    expect(getLegacyAnnualIncomeRes.body.section.payload.annualIncome.incomeSources).toHaveLength(
      1
    );
    expect(getLegacyAnnualIncomeRes.body.section.payload.annualIncome.incomeSources[0].label).toBe(
      "Main employer"
    );

    const listSectionsRes = await request(server)
      .get(`/tax/filings/${report.id}/reports/${report.id}/sections`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(listSectionsRes.status).toBe(200);
    expect(listSectionsRes.body.sections).toHaveLength(8);
    expect(
      listSectionsRes.body.sections.map((section: { sectionKey: string }) => section.sectionKey)
    ).toEqual(
      expect.arrayContaining([
        "personalDetails",
        "income",
        "healthInsurance",
        "otherInsurances",
        "additionalExpenses",
        "taxOfficeInfo",
        "payslips",
        "children",
      ])
    );

    const storedAnnualIncome = await db.client.taxReportSection.findFirst({
      where: {
        reportId: report.id,
        sectionKey: "annualIncome",
      },
    });

    expect(storedAnnualIncome).not.toBeNull();
    expect(storedAnnualIncome?.payload).toMatchObject({
      annualIncome: {
        incomeSources: [
          {
            label: "Main employer",
          },
        ],
      },
    });
  });
});
