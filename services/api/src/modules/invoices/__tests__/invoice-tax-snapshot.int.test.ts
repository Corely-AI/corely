import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaService } from "@corely/data";

describe("Invoice Tax Snapshot - Database Integration", () => {
  let prisma: PrismaService;
  const testTenantId = `test-tax-${Date.now()}`;
  const testCustomerId = `customer-${Date.now()}`;
  let testInvoiceId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function setupTestData() {
    // Create test tenant
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: "Test Tenant Tax",
        slug: `test-tax-${Date.now()}`,
        status: "ACTIVE",
      },
    });

    // Create tax profile using raw SQL to bypass type checking
    await prisma.$executeRaw`
      INSERT INTO "TaxProfile" (
        id, "tenantId", country, regime, "vatEnabled", currency, 
        "filingFrequency", "vatAccountingMethod", "effectiveFrom", "createdAt", "updatedAt"
      ) VALUES (
        ${`profile-${Date.now()}`},
        ${testTenantId},
        'DE',
        'STANDARD_VAT',
        true,
        'EUR',
        'QUARTERLY',
        'SOLL',
        ${new Date("2024-01-01")},
        NOW(),
        NOW()
      )
    `;

    // Create customer
    await prisma.party.create({
      data: {
        id: testCustomerId,
        tenantId: testTenantId,
        displayName: "Test Customer",
      },
    });

    // Create test invoice with tax snapshot using $executeRaw to bypass type checking
    const result = await prisma.$executeRaw`
      INSERT INTO "Invoice" (
        id, "tenantId", "customerPartyId", number, currency, status, "issuedAt", 
        "taxSnapshot", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        ${testTenantId},
        ${testCustomerId},
        ${"INV-TEST-" + Date.now()},
        'EUR',
        'ISSUED',
        ${new Date("2026-01-15")},
        ${JSON.stringify({
          subtotalAmountCents: 100000,
          taxTotalAmountCents: 19000,
          totalAmountCents: 119000,
          lines: [
            {
              lineId: "line1",
              kind: "STANDARD",
              rateBps: 1900,
              netAmountCents: 100000,
              taxAmountCents: 19000,
              grossAmountCents: 119000,
            },
          ],
          totalsByKind: {
            STANDARD: {
              netAmountCents: 100000,
              taxAmountCents: 19000,
              grossAmountCents: 119000,
              rateBps: 1900,
            },
          },
          appliedAt: new Date().toISOString(),
        })}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    // Get the created invoice ID
    const invoice = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Invoice" 
      WHERE "tenantId" = ${testTenantId} 
      AND status = 'ISSUED'
      LIMIT 1
    `;
    testInvoiceId = invoice[0].id;

    // Add invoice line
    await prisma.$executeRaw`
      INSERT INTO "InvoiceLine" (id, "invoiceId", description, qty, "unitPriceCents")
      VALUES (gen_random_uuid(), ${testInvoiceId}, 'Test Product', 1, 100000)
    `;
  }

  async function cleanupTestData() {
    await prisma.$executeRaw`DELETE FROM "InvoiceLine" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "tenantId" = ${testTenantId})`;
    await prisma.$executeRaw`DELETE FROM "Invoice" WHERE "tenantId" = ${testTenantId}`;
    await prisma.$executeRaw`DELETE FROM "TaxProfile" WHERE "tenantId" = ${testTenantId}`;
    await prisma.$executeRaw`DELETE FROM "Party" WHERE "tenantId" = ${testTenantId}`;
    await prisma.$executeRaw`DELETE FROM "Tenant" WHERE id = ${testTenantId}`;
  }

  it("should save and retrieve tax snapshot from database", async () => {
    const invoice = await prisma.$queryRaw<
      Array<{
        id: string;
        number: string;
        status: string;
        taxSnapshot: any;
      }>
    >`
      SELECT id, number, status, "taxSnapshot"
      FROM "Invoice"
      WHERE id = ${testInvoiceId}
    `;

    expect(invoice).toHaveLength(1);
    expect(invoice[0].status).toBe("ISSUED");
    expect(invoice[0].taxSnapshot).toBeTruthy();

    const taxSnapshot = invoice[0].taxSnapshot;
    expect(taxSnapshot.subtotalAmountCents).toBe(100000);
    expect(taxSnapshot.taxTotalAmountCents).toBe(19000);
    expect(taxSnapshot.totalAmountCents).toBe(119000);
    expect(taxSnapshot.lines).toHaveLength(1);
    expect(taxSnapshot.lines[0].kind).toBe("STANDARD");
    expect(taxSnapshot.totalsByKind).toBeTruthy();
    expect(taxSnapshot.totalsByKind.STANDARD.taxAmountCents).toBe(19000);
  });

  it("should query tax snapshot data for VAT period calculation", async () => {
    const invoices = await prisma.$queryRaw<
      Array<{
        id: string;
        number: string;
        issuedAt: Date;
        currency: string;
        taxSnapshot: any;
      }>
    >`
      SELECT id, number, "issuedAt", currency, "taxSnapshot"
      FROM "Invoice"
      WHERE "tenantId" = ${testTenantId}
        AND status IN ('ISSUED', 'SENT', 'PAID')
        AND "issuedAt" >= ${new Date("2026-01-01")}
        AND "issuedAt" < ${new Date("2026-04-01")}
    `;

    expect(invoices).toHaveLength(1);
    expect(invoices[0].taxSnapshot).toBeTruthy();

    const snapshot = invoices[0].taxSnapshot;
    expect(snapshot.taxTotalAmountCents).toBe(19000);

    // Calculate total VAT for the period
    let totalVat = 0;
    for (const inv of invoices) {
      if (inv.taxSnapshot) {
        totalVat += inv.taxSnapshot.taxTotalAmountCents || 0;
      }
    }

    expect(totalVat).toBe(19000);
  });

  it("should handle invoice without tax snapshot", async () => {
    // Create invoice without tax snapshot
    await prisma.$executeRaw`
      INSERT INTO "Invoice" (
        id, "tenantId", "customerPartyId", number, currency, status, "issuedAt",
        "taxSnapshot", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        ${testTenantId},
        ${testCustomerId},
        ${"INV-NO-TAX-" + Date.now()},
        'EUR',
        'ISSUED',
        ${new Date("2026-01-20")},
        NULL,
        NOW(),
        NOW()
      )
    `;

    const invoicesWithoutTax = await prisma.$queryRaw<
      Array<{
        id: string;
        taxSnapshot: any;
      }>
    >`
      SELECT id, "taxSnapshot"
      FROM "Invoice"
      WHERE "tenantId" = ${testTenantId}
        AND "taxSnapshot" IS NULL
    `;

    expect(invoicesWithoutTax.length).toBeGreaterThan(0);
    expect(invoicesWithoutTax[0].taxSnapshot).toBeNull();
  });

  it("should verify tax snapshot JSON structure matches schema", async () => {
    const invoice = await prisma.$queryRaw<Array<{ taxSnapshot: any }>>`
      SELECT "taxSnapshot"
      FROM "Invoice"
      WHERE id = ${testInvoiceId}
    `;

    const snapshot = invoice[0].taxSnapshot;

    // Verify required fields exist
    expect(snapshot).toHaveProperty("subtotalAmountCents");
    expect(snapshot).toHaveProperty("taxTotalAmountCents");
    expect(snapshot).toHaveProperty("totalAmountCents");
    expect(snapshot).toHaveProperty("lines");
    expect(snapshot).toHaveProperty("totalsByKind");
    expect(snapshot).toHaveProperty("appliedAt");

    // Verify lines structure
    expect(Array.isArray(snapshot.lines)).toBe(true);
    snapshot.lines.forEach((line: any) => {
      expect(line).toHaveProperty("kind");
      expect(line).toHaveProperty("netAmountCents");
      expect(line).toHaveProperty("taxAmountCents");
      expect(line).toHaveProperty("grossAmountCents");
      expect(line).toHaveProperty("rateBps");
    });

    // Verify totalsByKind structure
    expect(typeof snapshot.totalsByKind).toBe("object");
    Object.values(snapshot.totalsByKind).forEach((total: any) => {
      expect(total).toHaveProperty("netAmountCents");
      expect(total).toHaveProperty("taxAmountCents");
      expect(total).toHaveProperty("grossAmountCents");
    });
  });
});
