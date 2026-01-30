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

describe("Tax Deductible Expenses Calculation (Integration)", () => {
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

  it("calculates deductible expenses correctly from expenses", async () => {
    // 1. Create an Expense
    const expensePayload = {
      merchant: "Office Supplies Co",
      totalCents: 12000, // 120.00 EUR
      taxAmountCents: 1900, // 19.00 EUR
      currency: "EUR",
      category: "OFFICE_SUPPLIES",
      issuedAt: "2025-03-15T10:00:00Z",
      idempotencyKey: "exp-test-1",
    };

    const createExpenseRes = await request(server)
      .post("/expenses")
      .send(expensePayload)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(createExpenseRes.status).toBe(201);
    const expenseId = createExpenseRes.body.id;

    // 2. Create Income Tax Filing for 2025
    const filingPayload = {
      type: "income-annual", // mapped to INCOME_TAX in backend
      year: 2025,
      periodKey: "2025",
    };

    const createFilingRes = await request(server)
      .post("/tax/filings")
      .send(filingPayload)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(createFilingRes.status).toBe(201);
    const filingId = createFilingRes.body.id;

    // 3. Manually trigger snapshot creation if needed?
    // In a real scenario, this should be automatic via events.
    // However, since we are testing "why it is 0", we suspect it IS NOT automatic.
    // If we assume the system *should* work, we assume creating expense is enough.
    // Let's verify the detail page immediately.

    const detailRes = await request(server)
      .get(`/tax/filings/${filingId}`)
      .set(HEADER_TENANT_ID, tenantId)
      .set(HEADER_WORKSPACE_ID, workspaceId)
      .set("x-user-id", userId);

    expect(detailRes.status).toBe(200);
    const filing = detailRes.body.filing;

    // 4. Assert Totals
    // Deductible expenses should matches the expense we created.
    // Logic in useCase: sum(snap.totalAmountCents)
    // If no snapshot created, it will be 0.

    // We expect it to be 12000 if the system was working correctly.
    // If the bug exists, this will likely be 0.
    expect(filing.totals).toBeDefined();
    // This assertion will fail if the bug is present
    expect(filing.totals.deductibleExpensesCents).toBe(12000);
  });
});
