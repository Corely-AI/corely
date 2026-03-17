import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import {
  createApiTestApp,
  createCustomerParty,
  createTenant,
  createTestDb,
  stopSharedContainer,
} from "@corely/testkit";
import { JwtTokenService } from "../../identity/infrastructure/security/jwt.token-service";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Invoices API (HTTP + Postgres)", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;
  let tokenService: JwtTokenService;
  let tenantAId: string;
  let tenantBId: string;
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
    const tenantA = await createTenant(prisma, { name: "Tenant A" });
    const tenantB = await createTenant(prisma, { name: "Tenant B" });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;
    const customerA = await createCustomerParty(prisma, tenantAId);
    customerAId = customerA.id;
  });

  afterAll(async () => {
    await app.close();
    await db.down();
    await stopSharedContainer();
  });

  const buildAuthHeader = (
    tenantId: string,
    userId = "user-123",
    roleIds: string[] = ["test-permission-role"]
  ) => {
    const token = tokenService.generateAccessToken({
      userId,
      email: `${userId}@example.com`,
      tenantId,
      roleIds,
    });
    return `Bearer ${token}`;
  };

  it("creates an invoice for authenticated tenant", async () => {
    const res = await request(server)
      .post("/invoices")
      .set("authorization", buildAuthHeader(tenantAId))
      .send({
        tenantId: tenantAId,
        customerPartyId: customerAId,
        currency: "USD",
        lineItems: [{ description: "Service", qty: 1, unitPriceCents: 2500 }],
        idempotencyKey: "inv-api-1",
        actorUserId: "user-123",
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toMatchObject({
      tenantId: tenantAId,
      status: "DRAFT",
      currency: "USD",
    });
  });

  it("rejects missing auth", async () => {
    const res = await request(server)
      .post("/invoices")
      .send({
        tenantId: tenantAId,
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
      .set("authorization", buildAuthHeader(tenantAId))
      .send({
        tenantId: tenantAId,
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
      .set("authorization", buildAuthHeader(tenantBId, "user-tenant-b"));

    expect(fetchAsOtherTenant.status).toBe(404);
  });

  it("persists invoice payment rows and returns them after marking invoice paid", async () => {
    const authHeader = buildAuthHeader(tenantAId);
    const createRes = await request(server)
      .post("/invoices")
      .set("authorization", authHeader)
      .send({
        tenantId: tenantAId,
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
      .set("authorization", authHeader)
      .send({});
    expect(finalizeRes.status).toBe(201);

    const paidAt = "2025-12-20T00:00:00.000Z";
    const paymentRes = await request(server)
      .post(`/invoices/${invoiceId}/payments`)
      .set("authorization", authHeader)
      .send({
        amountCents: 10000,
        paidAt,
        note: "Bank transfer",
      });

    expect(paymentRes.status).toBe(201);
    expect(paymentRes.body.status).toBe("PAID");
    expect(Array.isArray(paymentRes.body.payments)).toBe(true);
    expect(paymentRes.body.payments.length).toBe(1);
    expect(paymentRes.body.payments[0].paidAt).toBe(paidAt);

    const getRes = await request(server)
      .get(`/invoices/${invoiceId}`)
      .set("authorization", authHeader);

    expect(getRes.status).toBe(200);
    expect(getRes.body.invoice.status).toBe("PAID");
    expect(getRes.body.invoice.payments).toHaveLength(1);
    expect(getRes.body.invoice.payments[0]).toEqual(
      expect.objectContaining({
        amountCents: 10000,
        paidAt,
      })
    );
  });
});
