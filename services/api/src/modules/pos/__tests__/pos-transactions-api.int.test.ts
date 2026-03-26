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
import { HEADER_TENANT_ID, HEADER_WORKSPACE_ID } from "@/shared/request-context";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("GET /pos/admin/transactions (API)", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;

  beforeAll(async () => {
    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await db.reset();
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

  const insertPosSaleRecord = async (params: {
    id: string;
    workspaceId: string;
    sessionId: string;
    registerId: string;
    receiptNumber: string;
    saleDate: string;
    cashierEmployeePartyId: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    idempotencyKey: string;
    serverInvoiceId: string;
    serverPaymentId: string;
    syncedAt: string;
  }) => {
    await db.client.$executeRawUnsafe(
      `
        INSERT INTO "commerce"."pos_sale_records" (
          "id",
          "workspace_id",
          "session_id",
          "register_id",
          "receipt_number",
          "sale_date",
          "cashier_employee_party_id",
          "customer_party_id",
          "subtotal_cents",
          "tax_cents",
          "total_cents",
          "currency",
          "status",
          "line_items_json",
          "payments_json",
          "idempotency_key",
          "server_invoice_id",
          "server_payment_id",
          "synced_at",
          "created_at",
          "updated_at"
        )
        VALUES (
          '${params.id}',
          '${params.workspaceId}',
          '${params.sessionId}',
          '${params.registerId}',
          '${params.receiptNumber}',
          '${params.saleDate}'::timestamptz,
          '${params.cashierEmployeePartyId}',
          NULL,
          ${params.subtotalCents},
          ${params.taxCents},
          ${params.totalCents},
          'EUR',
          'SYNCED',
          '[]'::jsonb,
          '[]'::jsonb,
          '${params.idempotencyKey}',
          '${params.serverInvoiceId}',
          '${params.serverPaymentId}',
          '${params.syncedAt}'::timestamptz,
          NOW(),
          NOW()
        )
      `
    );
  };

  it("lists only workspace-scoped transactions and applies query filters", async () => {
    const seed = await seedDefaultTenant(app);
    const workspace = await db.client.workspace.findUniqueOrThrow({
      where: { id: seed.workspaceId },
      include: { legalEntity: true },
    });

    await db.client.legalEntity.update({
      where: { id: workspace.legalEntity.id },
      data: { kind: "COMPANY" },
    });

    const secondWorkspace = await db.client.workspace.create({
      data: {
        tenantId: seed.tenantId,
        legalEntityId: workspace.legalEntityId,
        name: "Scoped POS Workspace",
        slug: `scoped-pos-${Date.now()}`,
        onboardingStatus: "DONE",
      },
    });

    const firstRegister = await db.client.register.create({
      data: {
        workspaceId: seed.workspaceId,
        name: "Front Counter",
        status: "ACTIVE",
      },
    });

    const secondRegister = await db.client.register.create({
      data: {
        workspaceId: secondWorkspace.id,
        name: "Back Counter",
        status: "ACTIVE",
      },
    });

    await Promise.all([
      insertPosSaleRecord({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        workspaceId: seed.workspaceId,
        sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        registerId: firstRegister.id,
        receiptNumber: "POS-ALPHA",
        saleDate: "2026-03-25T10:14:00.000Z",
        cashierEmployeePartyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        subtotalCents: 2140,
        taxCents: 214,
        totalCents: 2354,
        idempotencyKey: "sale-alpha",
        serverInvoiceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        serverPaymentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        syncedAt: "2026-03-25T10:15:00.000Z",
      }),
      insertPosSaleRecord({
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        workspaceId: seed.workspaceId,
        sessionId: "12121212-1212-4212-8212-121212121212",
        registerId: firstRegister.id,
        receiptNumber: "POS-BETA",
        saleDate: "2026-03-20T08:00:00.000Z",
        cashierEmployeePartyId: "34343434-3434-4434-8434-343434343434",
        subtotalCents: 990,
        taxCents: 99,
        totalCents: 1089,
        idempotencyKey: "sale-beta",
        serverInvoiceId: "56565656-5656-4565-8565-565656565656",
        serverPaymentId: "78787878-7878-4787-8787-787878787878",
        syncedAt: "2026-03-20T08:01:00.000Z",
      }),
      insertPosSaleRecord({
        id: "99999999-9999-4999-8999-999999999999",
        workspaceId: secondWorkspace.id,
        sessionId: "abababab-abab-4bab-8bab-abababababab",
        registerId: secondRegister.id,
        receiptNumber: "POS-GAMMA",
        saleDate: "2026-03-25T11:00:00.000Z",
        cashierEmployeePartyId: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
        subtotalCents: 500,
        taxCents: 50,
        totalCents: 550,
        idempotencyKey: "sale-gamma",
        serverInvoiceId: "efefefef-efef-4fef-8fef-efefefefefef",
        serverPaymentId: "10101010-1010-4010-8010-101010101010",
        syncedAt: "2026-03-25T11:01:00.000Z",
      }),
    ]);

    const res = await request(server)
      .get("/pos/admin/transactions")
      .query({
        q: "POS-ALPHA",
        fromDate: "2026-03-25",
        toDate: "2026-03-25",
        page: 1,
        pageSize: 10,
      })
      .set(HEADER_TENANT_ID, seed.tenantId)
      .set(HEADER_WORKSPACE_ID, seed.workspaceId)
      .set("x-user-id", seed.userId);

    expect(res.status).toBe(200);
    expect(res.body.pageInfo).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 1,
      hasNextPage: false,
    });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      transactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      receiptNumber: "POS-ALPHA",
      registerName: "Front Counter",
    });
  });

  it("rejects access when the active role does not grant pos.transactions.read", async () => {
    const seed = await seedDefaultTenant(app);
    const workspace = await db.client.workspace.findUniqueOrThrow({
      where: { id: seed.workspaceId },
      include: { legalEntity: true },
    });

    await db.client.legalEntity.update({
      where: { id: workspace.legalEntity.id },
      data: { kind: "COMPANY" },
    });

    const noAccessRole = await db.client.role.create({
      data: {
        tenantId: seed.tenantId,
        name: "No POS Access",
        isSystem: false,
      },
    });

    await db.client.membership.updateMany({
      where: {
        tenantId: seed.tenantId,
        userId: seed.userId,
      },
      data: {
        roleId: noAccessRole.id,
      },
    });

    const res = await request(server)
      .get("/pos/admin/transactions")
      .set(HEADER_TENANT_ID, seed.tenantId)
      .set(HEADER_WORKSPACE_ID, seed.workspaceId)
      .set("x-user-id", seed.userId);

    expect(res.status).toBe(403);
  });
});
