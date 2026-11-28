import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import {
  createApiTestApp,
  createCustomerParty,
  createTestDb,
  stopSharedContainer,
} from "@corely/testkit";
import { JwtTokenService } from "../../identity/infrastructure/security/jwt.token-service";
import { EnableAppUseCase } from "../../platform/application/use-cases/enable-app.usecase";
import type { SeedResult, TestHarnessService } from "../../test-harness/test-harness.service";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Invoices API (HTTP + Postgres)", () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let db: PostgresTestDb;
  let tokenService: JwtTokenService;
  let tenantA: SeedResult;
  let tenantB: SeedResult;
  let customerAId: string;

  beforeAll(async () => {
    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer();
    tokenService = new JwtTokenService();
  });

  beforeEach(async () => {
    await db.reset();
    const prisma = db.client;
    const harness = app.get<TestHarnessService>("TEST_HARNESS_SERVICE");
    tenantA = await harness.seedTestData({
      email: "invoice-owner-a@example.test",
      password: "FixturePassword123!",
      tenantName: "Invoice fixture tenant A",
    });
    tenantB = await harness.seedTestData({
      email: "invoice-owner-b@example.test",
      password: "FixturePassword123!",
      tenantName: "Invoice fixture tenant B",
    });
    await prisma.tenantFeatureOverride.createMany({
      data: [tenantA, tenantB].flatMap(({ tenantId, userId }) =>
        ["app.invoices.enabled", "app.parties.enabled"].map((featureKey) => ({
          tenantId,
          featureKey,
          valueJson: "true",
          updatedBy: userId,
        }))
      ),
      skipDuplicates: true,
    });
    const enableApp = app.get(EnableAppUseCase);
    for (const { tenantId, userId } of [tenantA, tenantB]) {
      await enableApp.execute({ tenantId, appId: "invoices", actorUserId: userId });
    }
    const customerA = await createCustomerParty(prisma, tenantA.tenantId);
    customerAId = customerA.id;
    await prisma.address.update({
      where: {
        tenantId_partyId_type_address: {
          tenantId: tenantA.tenantId,
          partyId: customerAId,
          type: "BILLING",
        },
      },
      data: { country: "DE" },
    });
    await prisma.taxProfile.create({
      data: {
        tenantId: tenantA.tenantId,
        country: "DE",
        regime: "STANDARD_VAT",
        currency: "EUR",
        vatEnabled: true,
        filingFrequency: "QUARTERLY",
        effectiveFrom: new Date("2020-01-01"),
      },
    });
  });

  afterAll(async () => {
    await app?.close();
    await db?.down();
    await stopSharedContainer();
  });

  const authHeaders = (tenant: SeedResult) => ({
    authorization: `Bearer ${tokenService.generateAccessToken({
      userId: tenant.userId,
      email: tenant.email,
      tenantId: tenant.tenantId,
      roleIds: [],
    })}`,
    "x-workspace-id": tenant.workspaceId,
  });

  it("creates an invoice for authenticated tenant", async () => {
    const res = await request(server)
      .post("/invoices")
      .set(authHeaders(tenantA))
      .send({
        customerPartyId: customerAId,
        currency: "USD",
        lineItems: [{ description: "Service", qty: 1, unitPriceCents: 2500 }],
        idempotencyKey: "inv-api-1",
        actorUserId: "user-123",
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toMatchObject({
      tenantId: tenantA.workspaceId,
      status: "DRAFT",
      currency: "USD",
    });
  });

  it("rejects missing auth", async () => {
    const res = await request(server)
      .post("/invoices")
      .send({
        customerPartyId: customerAId,
        currency: "USD",
        lineItems: [{ description: "Service", qty: 1, unitPriceCents: 2500 }],
        idempotencyKey: "inv-api-2",
        actorUserId: "user-123",
      });

    expect(res.status).toBe(401);
  });

  it("does not leak invoices across tenants", async () => {
    const createRes = await request(server)
      .post("/invoices")
      .set(authHeaders(tenantA))
      .send({
        customerPartyId: customerAId,
        currency: "USD",
        lineItems: [{ description: "Service", qty: 1, unitPriceCents: 2500 }],
        idempotencyKey: "inv-api-3",
        actorUserId: "user-tenant-a",
      });

    const invoiceId = createRes.body.id;
    expect(invoiceId).toBeDefined();

    const fetchAsOtherTenant = await request(server)
      .get(`/invoices/${invoiceId}`)
      .set(authHeaders(tenantB));

    expect(fetchAsOtherTenant.status).toBe(404);
  });

  it("persists invoice payment rows and returns them after marking invoice paid", async () => {
    const headers = authHeaders(tenantA);
    const createRes = await request(server)
      .post("/invoices")
      .set(headers)
      .send({
        customerPartyId: customerAId,
        currency: "EUR",
        lineItems: [{ description: "Consulting", qty: 1, unitPriceCents: 10000 }],
        idempotencyKey: "inv-api-payment-1",
        actorUserId: "user-tenant-a",
      });

    expect([200, 201]).toContain(createRes.status);
    const invoiceId: string = createRes.body.id;

    const finalizeRes = await request(server)
      .post(`/invoices/${invoiceId}/finalize`)
      .set(headers)
      .send({});
    expect(finalizeRes.status).toBe(201);
    const totalCents: number = finalizeRes.body.totals.totalCents;

    const paidAt = "2025-12-20T00:00:00.000Z";
    const paymentRes = await request(server)
      .post(`/invoices/${invoiceId}/payments`)
      .set(headers)
      .send({
        amountCents: totalCents,
        paidAt,
        note: "Bank transfer",
      });

    expect(paymentRes.status).toBe(201);
    expect(paymentRes.body.status).toBe("PAID");
    expect(Array.isArray(paymentRes.body.payments)).toBe(true);
    expect(paymentRes.body.payments.length).toBe(1);
    expect(paymentRes.body.payments[0].paidAt).toBe(paidAt);

    const getRes = await request(server).get(`/invoices/${invoiceId}`).set(headers);

    expect(getRes.status).toBe(200);
    expect(getRes.body.invoice.status).toBe("PAID");
    expect(getRes.body.invoice.payments).toHaveLength(1);
    expect(getRes.body.invoice.payments[0]).toEqual(
      expect.objectContaining({
        amountCents: totalCents,
        paidAt,
      })
    );
  });

  it("creates an authorized correction linked to the original workspace invoice", async () => {
    const input = {
      customerPartyId: customerAId,
      currency: "EUR",
      notes: "Original notes",
      lineItems: [{ description: "Service", qty: 1, unitPriceCents: 100 }],
    };
    const original = await request(server).post("/invoices").set(authHeaders(tenantA)).send(input);
    expect(original.status).toBe(201);
    const invoiceId: string = original.body.id;
    const issued = await request(server)
      .post(`/invoices/${invoiceId}/finalize`)
      .set(authHeaders(tenantA))
      .send({});
    expect(issued.status).toBe(201);
    const canceled = await request(server)
      .post(`/invoices/${invoiceId}/cancel`)
      .set(authHeaders(tenantA))
      .send({ reason: "Correction" });
    expect(canceled.status).toBe(201);
    expect(canceled.body).toMatchObject({
      status: "CANCELED",
      notes: input.notes,
      number: issued.body.number,
    });

    const correction = { ...input, correctsInvoiceId: invoiceId };
    const other = await request(server)
      .post("/invoices")
      .set(authHeaders(tenantB))
      .send(correction);
    expect(other.status).toBe(404);
    const created = await request(server)
      .post("/invoices")
      .set(authHeaders(tenantA))
      .send(correction);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      status: "DRAFT",
      number: null,
      sourceType: "invoice_correction",
      sourceId: invoiceId,
    });
  });
});
