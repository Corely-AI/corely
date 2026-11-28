import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceFinalizationRegistration } from "@corely/invoices/extensions";
import { requireDueDate } from "@acme/invoice-fixture/policy";
import type { LocalDate, TransactionContext } from "@corely/kernel";
import { FinalizeInvoiceUseCase } from "./finalize-invoice.usecase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { FakeInvoiceNumbering } from "../../../testkit/fakes/fake-numbering";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { FixedClock, NoopLogger, unwrap } from "@corely/kernel";
import { FakeCustomerQueryPort } from "../../../testkit/fakes/fake-customer-query";
import { FakePaymentMethodQuery } from "../../../testkit/fakes/fake-payment-method-query";
import { TaxEngineService } from "../../../../tax/application/services/tax-engine.service";
import { DEPackV1 } from "../../../../tax/application/services/jurisdictions/de-pack.v1";
import { InMemoryTaxProfileRepo } from "../../../../tax/testkit/fakes/in-memory-tax-profile-repo";
import { InMemoryTaxCodeRepo } from "../../../../tax/testkit/fakes/in-memory-tax-code-repo";
import { InMemoryTaxRateRepo } from "../../../../tax/testkit/fakes/in-memory-tax-rate-repo";
import { InMemoryJurisdictionPackRegistry } from "../../../../tax/domain/ports/jurisdiction-pack-registry.port";
import { InvoiceNumberConflictError } from "../../ports/invoice-repository.port";

describe("FinalizeInvoiceUseCase", () => {
  let repo: FakeInvoiceRepository;
  let numbering: FakeInvoiceNumbering;
  let useCase: FinalizeInvoiceUseCase;
  let customers: FakeCustomerQueryPort;
  let payments: FakePaymentMethodQuery;
  let policies: InvoiceFinalizationRegistration[];

  // Real Tax Engine dependencies
  let taxEngine: TaxEngineService;
  let profileRepo: InMemoryTaxProfileRepo;
  let taxCodeRepo: InMemoryTaxCodeRepo;
  let taxRateRepo: InMemoryTaxRateRepo;
  let dePack: DEPackV1;
  let packRegistry: InMemoryJurisdictionPackRegistry;
  const audit = { log: vi.fn() };
  const unitOfWork = {
    withinTransaction: <T>(fn: (tx: TransactionContext) => Promise<T>) =>
      fn({} as TransactionContext),
  };

  const clock = new FixedClock(new Date("2025-01-02T00:00:00.000Z"));

  beforeEach(async () => {
    audit.log.mockClear();
    repo = new FakeInvoiceRepository();
    numbering = new FakeInvoiceNumbering("INV");
    customers = new FakeCustomerQueryPort();
    customers.setSnapshot("tenant-1", {
      partyId: "cust",
      displayName: "Customer One",
      email: "customer@example.com",
      billingAddress: { line1: "Street 1", city: "Berlin", country: "DE" },
    });
    payments = new FakePaymentMethodQuery();
    policies = [];

    // Setup Real Tax Engine
    profileRepo = new InMemoryTaxProfileRepo();
    taxCodeRepo = new InMemoryTaxCodeRepo();
    taxRateRepo = new InMemoryTaxRateRepo();
    dePack = new DEPackV1(taxCodeRepo, taxRateRepo);
    packRegistry = new InMemoryJurisdictionPackRegistry();
    packRegistry.register(dePack);
    taxEngine = new TaxEngineService(profileRepo, packRegistry);

    // Seed Tax Data
    await profileRepo.upsert({
      tenantId: "tenant-1",
      country: "DE",
      regime: "STANDARD_VAT",
      vatEnabled: true,
      vatId: "DE123456789",
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      vatExemptionParagraph: null,
      euB2BSales: false,
      hasEmployees: false,
      usesTaxAdvisor: false,
      effectiveFrom: new Date("2024-01-01"),
      effectiveTo: null,
    });

    // Create implicit standard tax code (DE defaults to 19% even without code, but let's be explicit)
    // Note: DEPack logic will default to 1900bps if no codes exist for STANDARD

    useCase = new FinalizeInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      numbering,
      clock,
      customerQuery: customers,
      paymentMethodQuery: payments,
      taxEngine: taxEngine,
      audit,
      unitOfWork,
      policies,
    });
  });

  it("finalizes draft invoice and assigns number", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "EUR", // Changed to EUR to match tax profile
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
    });
    repo.invoices = [invoice];

    const result = await useCase.execute(
      { invoiceId: invoice.id },
      { tenantId: "tenant-1", workspaceId: "tenant-1" }
    );
    const dto = unwrap(result).invoice;
    expect(dto.status).toBe("ISSUED");
    expect(dto.number).toBe("INV-000001");
  });

  it("retries a numbering collision and returns the same invoice on replay", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "retry",
      tenantId: "workspace",
      customerPartyId: "cust",
      currency: "EUR",
      lineItems: [{ id: "line", description: "Work", qty: 2, unitPriceCents: 3 }],
      createdAt: clock.now(),
    });
    await repo.create(invoice.tenantId, invoice);
    vi.spyOn(repo, "save").mockRejectedValueOnce(new InvoiceNumberConflictError());
    const input = { invoiceId: invoice.id };
    const ctx = { tenantId: "tenant-1", workspaceId: invoice.tenantId };
    const issue = unwrap(await useCase.execute(input, ctx)).invoice;
    expect(issue).toMatchObject({
      number: "INV-000002",
      totals: { subtotalCents: 6, taxCents: 1, totalCents: 7 },
    });
    expect(unwrap(await useCase.execute(input, ctx)).invoice).toEqual(issue);
    expect(audit.log).toHaveBeenCalledTimes(1);
  });

  it("keeps a draft with invalid tax settings unnumbered", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "currency",
      tenantId: "workspace",
      customerPartyId: "cust",
      currency: "USD",
      lineItems: [{ id: "line", description: "Work", qty: 1, unitPriceCents: 100 }],
      createdAt: clock.now(),
    });
    await repo.create(invoice.tenantId, invoice);
    const result = await useCase.execute(
      { invoiceId: invoice.id },
      {
        tenantId: "tenant-1",
        workspaceId: invoice.tenantId,
      }
    );
    expect(result).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("active tax profile") },
    });
    expect(invoice).toMatchObject({ status: "DRAFT", number: null, taxSnapshot: null });
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("rejects an undated draft only in the configured workspace before consuming a number", async () => {
    const scope = { tenantId: "tenant-1", workspaceId: "workspace-1" };
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-policy",
      tenantId: scope.workspaceId,
      customerPartyId: "cust",
      currency: "EUR",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: clock.now(),
    });
    repo.invoices = [invoice];
    const nextNumber = vi.spyOn(numbering, "nextInvoiceNumber");
    const save = vi.spyOn(repo, "save");

    // A policy in another workspace cannot affect the current workspace.
    const otherRule = vi.fn(requireDueDate);
    policies.push({ ...scope, workspaceId: "another-workspace", validate: otherRule });
    policies.push({ ...scope, validate: requireDueDate });
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await useCase.execute({ invoiceId: invoice.id }, scope);
      expect(result).toMatchObject({
        ok: false,
        error: { code: "Invoices:FinalizationPolicyRejected" },
      });
    }
    expect(invoice.status).toBe("DRAFT");
    expect(otherRule).not.toHaveBeenCalled();
    expect(nextNumber).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();

    invoice.updateDates({ dueDate: "2025-01-31" as LocalDate }, clock.now());
    const dto = unwrap(await useCase.execute({ invoiceId: invoice.id }, scope)).invoice;
    expect(dto).toMatchObject({ status: "ISSUED", number: "INV-000001", customerPartyId: "cust" });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("keeps bill-to snapshot stable after finalize", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "EUR",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
    });
    repo.invoices = [invoice];

    await useCase.execute(
      { invoiceId: invoice.id },
      { tenantId: "tenant-1", workspaceId: "tenant-1" }
    );
    customers.setSnapshot("tenant-1", {
      partyId: "cust",
      displayName: "Changed Name",
    });
    expect(repo.invoices[0].billToName).toBe("Customer One");
  });

  it("snapshots payment method details on finalize", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "EUR",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
      paymentMethodId: "old-method",
      paymentSnapshot: { label: "Old draft account" },
    });
    repo.invoices = [invoice];

    payments.setMethod("tenant-1", "pm-1", {
      type: "BANK_TRANSFER",
      bankName: "My Bank",
      iban: "FR123",
      label: "Main Account",
    });

    const result = await useCase.execute(
      { invoiceId: invoice.id, paymentMethodId: "pm-1" },
      { tenantId: "tenant-1", workspaceId: "tenant-1" }
    );

    const finalized = repo.invoices[0];
    expect(unwrap(result).invoice).toMatchObject({
      paymentMethodId: "pm-1",
      paymentSnapshot: { label: "Main Account" },
    });
    expect(finalized.paymentDetails).toEqual({
      type: "BANK_TRANSFER",
      bankName: "My Bank",
      iban: "FR123",
      label: "Main Account",
    });
  });

  it("generates and snapshots tax calculation on finalize using real engine", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "EUR",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 10000 }], // 100.00 EUR
      createdAt: new Date(),
    });
    repo.invoices = [invoice];

    await useCase.execute(
      { invoiceId: invoice.id },
      { tenantId: "tenant-1", workspaceId: "tenant-1" }
    );

    const finalized = repo.invoices[0];

    // Check Tax Snapshot
    expect(finalized.taxSnapshot).toBeDefined();
    // 19% of 10000 = 1900
    expect(finalized.taxSnapshot?.subtotalAmountCents).toBe(10000);
    expect(finalized.taxSnapshot?.taxTotalAmountCents).toBe(1900);
    expect(finalized.taxSnapshot?.totalAmountCents).toBe(11900);

    // Check breakdown details
    expect(finalized.taxSnapshot?.lines).toHaveLength(1);
    expect(finalized.taxSnapshot?.lines[0].rateBps).toBe(1900);
    expect(finalized.taxSnapshot?.lines[0].kind).toBe("STANDARD");

    expect(finalized.taxSnapshot?.totalsByKind.STANDARD).toBeDefined();
    expect(finalized.taxSnapshot?.totalsByKind.STANDARD!.taxAmountCents).toBe(1900);
  });
});
