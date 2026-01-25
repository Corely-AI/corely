import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaService } from "@corely/data";
import { FixedClock, NoopLogger, unwrap } from "@corely/kernel";
import { InvoiceAggregate } from "../domain/invoice.aggregate";
import { FinalizeInvoiceUseCase } from "../application/use-cases/finalize-invoice/finalize-invoice.usecase";
import { PrismaInvoiceRepoAdapter } from "../infrastructure/adapters/prisma-invoice-repository.adapter";
import { PrismaTaxProfileRepoAdapter } from "../../tax/infrastructure/prisma/prisma-tax-profile-repo.adapter";
import { TaxEngineService } from "../../tax/application/services/tax-engine.service";
import { DEPackV1 } from "../../tax/application/services/jurisdictions/de-pack.v1";
import { PrismaTaxCodeRepoAdapter } from "../../tax/infrastructure/prisma/prisma-tax-code-repo.adapter";
import { PrismaTaxRateRepoAdapter } from "../../tax/infrastructure/prisma/prisma-tax-rate-repo.adapter";
import { FakeInvoiceNumbering } from "../../invoices/testkit/fakes/fake-numbering";
import { FakeCustomerQueryPort } from "../../invoices/testkit/fakes/fake-customer-query";
import { FakePaymentMethodQuery } from "../../invoices/testkit/fakes/fake-payment-method-query";

// Note: Using relative paths based on location in services/api/src/modules/invoices/__tests__/

describe("FinalizeInvoice UseCase - DB Integration", () => {
  let prisma: PrismaService;
  let useCase: FinalizeInvoiceUseCase;
  let taxProfileRepo: PrismaTaxProfileRepoAdapter;
  let invoiceRepo: PrismaInvoiceRepoAdapter;

  const testTenantId = `test-int-${Date.now()}`;
  const testCustomerId = `cust-${Date.now()}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    // Connect explicitly if needed, PrismaService usually does usually onModuleInit
    // but in test we might need simple connect
    // @ts-ignore private method access or just rely on lazy connect
    // prisma.$connect();

    // Setup Repos
    invoiceRepo = new PrismaInvoiceRepoAdapter(prisma);
    taxProfileRepo = new PrismaTaxProfileRepoAdapter(prisma);
    const taxCodeRepo = new PrismaTaxCodeRepoAdapter(prisma);
    const taxRateRepo = new PrismaTaxRateRepoAdapter(prisma);

    // Setup Domain Services
    const dePack = new DEPackV1(taxCodeRepo, taxRateRepo);
    const taxEngine = new TaxEngineService(taxProfileRepo, dePack);

    // Setup Fakes
    const numbering = new FakeInvoiceNumbering("INV-TEST");
    const customerQuery = new FakeCustomerQueryPort();

    // Seed Fake Customer Response (matches DB ID we will insert)
    customerQuery.setSnapshot(testTenantId, {
      partyId: testCustomerId,
      displayName: "Integration Customer",
      email: "test@example.com",
      vatId: "DE999999999",
      billingAddress: { country: "DE", line1: "Test Str 1", city: "Berlin" },
    });

    const paymentMethodQuery = new FakePaymentMethodQuery();
    const clock = new FixedClock(new Date());

    // Instantiate Use Case
    useCase = new FinalizeInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo,
      numbering,
      clock,
      customerQuery,
      paymentMethodQuery,
      taxEngine,
    });

    // Setup DB prerequisites
    await setupDbData(prisma);
  });

  afterAll(async () => {
    await cleanupDbData(prisma);
    await prisma.$disconnect();
  });

  async function setupDbData(p: PrismaService) {
    // 1. Tenant
    await p.tenant.create({
      data: { id: testTenantId, name: "Integration Tenant", slug: testTenantId, status: "ACTIVE" },
    });

    // 2. Customer Party
    await p.party.create({
      data: { id: testCustomerId, tenantId: testTenantId, displayName: "Integration Customer" },
    });

    // 3. Tax Profile (Standard VAT, DE)
    await taxProfileRepo.upsert({
      tenantId: testTenantId,
      country: "DE",
      regime: "STANDARD_VAT",
      vatEnabled: true,
      vatId: "DE123456789",
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      vatAccountingMethod: "IST",
      vatExemptionParagraph: null,
      euB2BSales: false,
      hasEmployees: false,
      usesTaxAdvisor: false,
      effectiveFrom: new Date("2020-01-01"),
      effectiveTo: null,
    });
  }

  async function cleanupDbData(p: PrismaService) {
    // Basic cleanup - cascade delete usually handles it but we do manual strict order
    const invoiceIds = await p.invoice.findMany({
      where: { tenantId: testTenantId },
      select: { id: true },
    });
    const ids = invoiceIds.map((i) => i.id);
    if (ids.length) {
      await p.invoiceLine.deleteMany({ where: { invoiceId: { in: ids } } });
      await p.invoice.deleteMany({ where: { id: { in: ids } } });
    }
    await p.taxProfile.deleteMany({ where: { tenantId: testTenantId } });
    await p.party.deleteMany({ where: { tenantId: testTenantId } });
    await p.tenant.delete({ where: { id: testTenantId } });
  }

  it("should calculate tax and save snapshot to DB when finalizing", async () => {
    // 1. Create Draft in DB directly (simulating previous step)
    const draftId = `inv-${Date.now()}`;
    await prisma.invoice.create({
      data: {
        id: draftId,
        tenantId: testTenantId,
        customerPartyId: testCustomerId,
        status: "DRAFT",
        currency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
        // Line Items
        lines: {
          create: [
            { id: `line-${Date.now()}`, description: "Consulting", qty: 1, unitPriceCents: 100000 }, // 1000 EUR
          ],
        },
      },
    });

    // 2. Execute Use Case
    const result = await useCase.execute(
      { invoiceId: draftId },
      { tenantId: testTenantId, workspaceId: testTenantId }
    );

    const output = unwrap(result);
    console.log("USE CASE OUTPUT:", JSON.stringify(output, null, 2));

    // 3. Verify DB via Repository (restores Aggregate logic)
    const savedAggregate = await invoiceRepo.findById(testTenantId, draftId);
    expect(savedAggregate).not.toBeNull();
    if (!savedAggregate) return;

    expect(savedAggregate.status).toBe("ISSUED");
    expect(savedAggregate.taxSnapshot).not.toBeNull();

    // Verify Snaphot Content
    const snapshot = savedAggregate.taxSnapshot!;
    expect(snapshot.taxTotalAmountCents).toBe(19000); // 19% of 100000
    expect(snapshot.totalAmountCents).toBe(119000);
    expect(snapshot.lines).toHaveLength(1);
    expect(snapshot.lines[0].rateBps).toBe(1900);

    // Verify Invoice Totals (Domain Logic should now include tax)
    // Currently this will FAIL because calculateTotals ignores taxSnapshot
    expect(savedAggregate.totals.subtotalCents).toBe(100000);
    expect(savedAggregate.totals.taxCents).toBe(19000);
    expect(savedAggregate.totals.totalCents).toBe(119000);
  });
});
