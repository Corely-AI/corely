import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaService,
  PrismaUnitOfWork,
} from "@corely/data";
import { FixedClock, NoopLogger, TimeService, unwrap } from "@corely/kernel";
import { InvoiceDtoSchema, type CreateInvoiceInput } from "@corely/contracts";
import { CreateInvoiceUseCase } from "../application/use-cases/create-invoice/create-invoice.usecase";
import { FinalizeInvoiceUseCase } from "../application/use-cases/finalize-invoice/finalize-invoice.usecase";
import { CancelInvoiceUseCase } from "../application/use-cases/cancel-invoice/cancel-invoice.usecase";
import { RecordPaymentUseCase } from "../application/use-cases/record-payment/record-payment.usecase";
import { UpdateInvoiceUseCase } from "../application/use-cases/update-invoice/update-invoice.usecase";
import { PrismaInvoiceRepoAdapter } from "../infrastructure/adapters/prisma-invoice-repository.adapter";
import { PrismaTaxProfileRepoAdapter } from "../../tax/infrastructure/prisma/prisma-tax-profile-repo.adapter";
import { TaxEngineService } from "../../tax/application/services/tax-engine.service";
import { DEPackV1 } from "../../tax/application/services/jurisdictions/de-pack.v1";
import { PrismaTaxCodeRepoAdapter } from "../../tax/infrastructure/prisma/prisma-tax-code-repo.adapter";
import { PrismaTaxRateRepoAdapter } from "../../tax/infrastructure/prisma/prisma-tax-rate-repo.adapter";
import { InMemoryJurisdictionPackRegistry } from "../../tax/domain/ports/jurisdiction-pack-registry.port";
import { FakeInvoiceNumbering } from "../testkit/fakes/fake-numbering";
import { FakeCustomerQueryPort } from "../testkit/fakes/fake-customer-query";
import { FakePaymentMethodQuery } from "../testkit/fakes/fake-payment-method-query";
import { InvoiceAccountingAdapter } from "../infrastructure/adapters/invoice-accounting.adapter";
import { CogsPostingService } from "../../accounting/application/services/cogs-posting.service";
import { GetSetupStatusUseCase } from "../../accounting/application/use-cases/get-setup-status.usecase";
import { CreateJournalEntryUseCase } from "../../accounting/application/use-cases/create-journal-entry.usecase";
import {
  PrismaAccountingPeriodRepository,
  PrismaAccountingSettingsRepository,
  PrismaJournalEntryRepository,
  PrismaLedgerAccountRepository,
} from "../../accounting/infrastructure/adapters/prisma-accounting-repository.adapter";
import { PrismaCatalogRepositoryAdapter } from "../../catalog/infrastructure/adapters/prisma-catalog-repository.adapter";
import { PrismaInventoryLotRepository } from "../../inventory/infrastructure/adapters/prisma-inventory-lot-repository.adapter";

const url = process.env.INVOICE_TEST_DATABASE_URL;
const enabled =
  !!url && /^postgres(?:ql)?:\/\/[^/]+\/corely_invoice_test_[a-z0-9_]+(?:\?.*)?$/.test(url);

describe.skipIf(!enabled)("Invoice issuance and corrections in PostgreSQL", () => {
  let prisma: PrismaService;
  let repo: PrismaInvoiceRepoAdapter;
  let create: CreateInvoiceUseCase;
  let finalize: FinalizeInvoiceUseCase;
  let cancel: CancelInvoiceUseCase;
  let payment: RecordPaymentUseCase;
  let update: UpdateInvoiceUseCase;
  let createJournalEntry: CreateJournalEntryUseCase;
  const paymentMethodQuery = new FakePaymentMethodQuery();
  let audit: PrismaAuditAdapter;
  const tenantId = randomUUID();
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const ctx = { tenantId, workspaceId, userId: "fixture-user" };
  const logger = new NoopLogger();
  const clock = new FixedClock(new Date("2026-11-28T12:00:00Z"));
  const customerPartyId = randomUUID();
  const numbering = new FakeInvoiceNumbering("INV-TEST");

  const invoiceInput: CreateInvoiceInput = {
    customerPartyId,
    currency: "EUR",
    notes: "Original agreement",
    terms: "Due within 30 days",
    invoiceDate: "2026-11-28",
    lineItems: [
      { description: "First line", qty: 1, unitPriceCents: 3 },
      { description: "Second line", qty: 1, unitPriceCents: 3 },
    ],
  };

  async function draft(input: Partial<CreateInvoiceInput> = {}) {
    return unwrap(await create.execute({ ...invoiceInput, ...input }, ctx)).invoice;
  }

  function auditCount(entityId: string, action: string) {
    return prisma.auditLog.count({ where: { tenantId, entityId, action } });
  }

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", url);
    prisma = new PrismaService();
    repo = new PrismaInvoiceRepoAdapter(prisma);
    audit = new PrismaAuditAdapter(prisma);
    const unitOfWork = new PrismaUnitOfWork(prisma);
    await prisma.tenant.create({ data: { id: tenantId, name: "Invoice fixture", slug: tenantId } });
    await prisma.party.create({
      data: { id: customerPartyId, tenantId, displayName: "Invoice Customer" },
    });

    const taxProfileRepo = new PrismaTaxProfileRepoAdapter(prisma);
    await taxProfileRepo.upsert({
      tenantId,
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
      effectiveFrom: new Date("2026-01-01"),
      effectiveTo: null,
    });
    const packs = new InMemoryJurisdictionPackRegistry();
    packs.register(
      new DEPackV1(new PrismaTaxCodeRepoAdapter(prisma), new PrismaTaxRateRepoAdapter(prisma))
    );
    const taxEngine = new TaxEngineService(taxProfileRepo, packs);
    const customerQuery = new FakeCustomerQueryPort();
    customerQuery.setSnapshot(tenantId, {
      partyId: customerPartyId,
      displayName: "Invoice Customer",
      billingAddress: { country: "DE", line1: "Test Address" },
    });
    const idGenerator = { newId: randomUUID };
    const accountingDeps = {
      logger,
      clock,
      idGenerator,
      settingsRepo: new PrismaAccountingSettingsRepository(prisma),
      entryRepo: new PrismaJournalEntryRepository(prisma),
      accountRepo: new PrismaLedgerAccountRepository(prisma),
      periodRepo: new PrismaAccountingPeriodRepository(prisma),
    };
    createJournalEntry = new CreateJournalEntryUseCase(accountingDeps);
    const accounting = new InvoiceAccountingAdapter(
      { getSetupStatus: new GetSetupStatusUseCase(accountingDeps) },
      new CogsPostingService(
        logger,
        createJournalEntry,
        accountingDeps.accountRepo,
        accountingDeps.entryRepo
      ),
      new PrismaCatalogRepositoryAdapter(prisma),
      new PrismaInventoryLotRepository(prisma, new PrismaExtKvAdapter(prisma))
    );
    const draftDeps = {
      logger,
      invoiceRepo: repo,
      idGenerator,
      clock,
      customerQuery,
      paymentMethodQuery,
      legalEntityQuery: { getIssuerSnapshot: async () => null },
    };
    update = new UpdateInvoiceUseCase(draftDeps);
    create = new CreateInvoiceUseCase({
      ...draftDeps,
      accounting,
      timeService: new TimeService(clock, { getTenantTimeZone: async () => "UTC" }),
    });
    finalize = new FinalizeInvoiceUseCase({
      logger,
      invoiceRepo: repo,
      clock,
      customerQuery,
      paymentMethodQuery,
      taxEngine,
      numbering,
      audit,
      unitOfWork,
      accounting,
    });
    cancel = new CancelInvoiceUseCase({
      logger,
      invoiceRepo: repo,
      clock,
      audit,
      unitOfWork,
      accounting,
    });
    payment = new RecordPaymentUseCase({ logger, invoiceRepo: repo, clock, idGenerator });
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: workspaceId },
      select: { id: true },
    });
    const ids = invoices.map(({ id }) => id);
    await prisma.invoicePayment.deleteMany({ where: { invoiceId: { in: ids } } });
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: { in: ids } } });
    await prisma.invoice.deleteMany({ where: { tenantId: workspaceId } });
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.journalLine.deleteMany({ where: { tenantId } });
    await prisma.journalEntry.deleteMany({ where: { tenantId } });
    await prisma.ledgerAccount.deleteMany({ where: { tenantId } });
    await prisma.accountingSettings.deleteMany({ where: { tenantId } });
    await prisma.inventoryLot.deleteMany({ where: { tenantId } });
    await prisma.extKv.deleteMany({ where: { tenantId, moduleId: "inventory" } });
    await prisma.taxProfile.deleteMany({ where: { tenantId } });
    await prisma.party.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it("retains one number and one issuance audit on simultaneous issue and replay without Accounting setup", async () => {
    const invoice = await draft();
    const input = { invoiceId: invoice.id };
    const results = await Promise.all([finalize.execute(input, ctx), finalize.execute(input, ctx)]);
    const [first, second] = results.map((result) => unwrap(result).invoice);
    expect(first.number).toBeTruthy();
    expect(second.number).toBe(first.number);
    expect(unwrap(await finalize.execute(input, ctx)).invoice.number).toBe(first.number);
    expect(await auditCount(invoice.id, "invoice.issued")).toBe(1);
    expect(await prisma.accountingSettings.count({ where: { tenantId } })).toBe(0);
    expect(await prisma.journalEntry.count({ where: { tenantId } })).toBe(0);
    expect(first.taxSnapshot).toMatchObject({
      roundingMode: "PER_LINE",
      subtotalAmountCents: 6,
      taxTotalAmountCents: 2,
      totalAmountCents: 8,
    });
    expect(InvoiceDtoSchema.parse(first).totals.totalCents).toBe(8);
  });

  it("retries a database-identified numbering collision", async () => {
    const first = await draft();
    const issued = unwrap(await finalize.execute({ invoiceId: first.id }, ctx)).invoice;
    expect(issued.number).toBeTruthy();
    const next = await draft();
    const numbers = vi.spyOn(numbering, "nextInvoiceNumber").mockResolvedValueOnce(issued.number!);
    try {
      const result = unwrap(await finalize.execute({ invoiceId: next.id }, ctx)).invoice;
      expect(result.number).toBeTruthy();
      expect(result.number).not.toBe(issued.number);
      expect(numbers).toHaveBeenCalledTimes(2);
    } finally {
      numbers.mockRestore();
    }
  });

  it("retains issued details and delivery history and limits an original to one issued correction", async () => {
    const original = await draft();
    const issued = unwrap(await finalize.execute({ invoiceId: original.id }, ctx)).invoice;
    const entity = (await repo.findById(workspaceId, original.id))!;
    const expectedRevision = entity.revision;
    entity.markSent(clock.now(), clock.now());
    await repo.save(workspaceId, entity, { expectedRevision });
    const cancellation = { invoiceId: original.id, reason: "Correct the quantity" };
    const [one, two] = (
      await Promise.all([cancel.execute(cancellation, ctx), cancel.execute(cancellation, ctx)])
    ).map((result) => unwrap(result).invoice);
    expect(two).toEqual(one);
    expect(one).toMatchObject({
      status: "CANCELED",
      number: issued.number,
      notes: issued.notes,
      terms: issued.terms,
      issuedAt: issued.issuedAt,
      sentAt: clock.now().toISOString(),
      taxSnapshot: issued.taxSnapshot,
      lineItems: issued.lineItems,
    });
    expect(await auditCount(original.id, "invoice.canceled")).toBe(1);
    const cancellationAudit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: original.id, action: "invoice.canceled" },
    });
    expect(cancellationAudit.actorUserId).toBe(ctx.userId);
    expect(JSON.parse(cancellationAudit.details ?? "{}")).toMatchObject({
      workspaceId,
      reason: cancellation.reason,
      previousStatus: "SENT",
      invoiceNumber: issued.number,
    });

    const [left, right] = await Promise.all([
      draft({ correctsInvoiceId: original.id }),
      draft({ correctsInvoiceId: original.id }),
    ]);
    expect(left).toMatchObject({
      status: "DRAFT",
      number: null,
      sourceType: "invoice_correction",
      sourceId: original.id,
    });
    const results = await Promise.all([
      finalize.execute({ invoiceId: left.id }, ctx),
      finalize.execute({ invoiceId: right.id }, ctx),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({
      error: {
        code: "CONFLICT",
        message: expect.stringContaining("correction has already been issued"),
      },
    });
    expect(
      await prisma.invoice.count({
        where: { tenantId: workspaceId, sourceId: original.id, number: { not: null } },
      })
    ).toBe(1);
  });

  it("rejects cross-workspace correction sources and cancellation after a partial payment", async () => {
    const first = await draft();
    unwrap(await finalize.execute({ invoiceId: first.id }, ctx));
    unwrap(await payment.execute({ invoiceId: first.id, amountCents: 1 }, ctx));
    expect(await cancel.execute({ invoiceId: first.id }, ctx)).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    expect(await auditCount(first.id, "invoice.canceled")).toBe(0);
    expect(
      await create.execute(
        { ...invoiceInput, correctsInvoiceId: first.id },
        {
          ...ctx,
          workspaceId: otherWorkspaceId,
        }
      )
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("rolls back invoice changes if issuing or canceling cannot be audited", async () => {
    const first = await draft();
    const brokenAudit = vi
      .spyOn(audit, "log")
      .mockRejectedValueOnce(new Error("Synthetic audit failure"));
    try {
      await expect(finalize.execute({ invoiceId: first.id }, ctx)).rejects.toThrow(
        "Synthetic audit failure"
      );
      expect(await repo.findById(workspaceId, first.id)).toMatchObject({
        status: "DRAFT",
        number: null,
        revision: 0,
      });
      unwrap(await finalize.execute({ invoiceId: first.id }, ctx));
      brokenAudit.mockRejectedValueOnce(new Error("Synthetic audit failure"));
      await expect(cancel.execute({ invoiceId: first.id }, ctx)).rejects.toThrow(
        "Synthetic audit failure"
      );
      expect(await repo.findById(workspaceId, first.id)).toMatchObject({
        status: "ISSUED",
        revision: 1,
      });
    } finally {
      brokenAudit.mockRestore();
    }
  });

  it("retains fractional quote quantities in drafts until they are edited for issuance", async () => {
    const sourceId = randomUUID();
    const invoice = await draft({
      sourceType: "quote",
      sourceId,
      lineItems: [{ description: "Consulting", qty: 1.005, unitPriceCents: 100 }],
    });
    const saved = await repo.findBySource(workspaceId, "quote", sourceId);
    expect(saved?.lineItems[0].qty).toBe(1.005);
    expect(saved?.totals.subtotalCents).toBe(101);
    expect(await finalize.execute({ invoiceId: invoice.id }, ctx)).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("whole quantities") },
    });
    expect(await repo.findById(workspaceId, invoice.id)).toMatchObject({
      status: "DRAFT",
      number: null,
    });
    unwrap(
      await update.execute(
        { invoiceId: invoice.id, lineItems: [{ ...invoice.lineItems[0], qty: 1 }] },
        ctx
      )
    );
    const issued = unwrap(await finalize.execute({ invoiceId: invoice.id }, ctx)).invoice;
    expect(issued).toMatchObject({ status: "ISSUED", lineItems: [{ qty: 1 }] });
  });

  it("uses default payment details when issuance receives an empty payment method ID", async () => {
    paymentMethodQuery.setDefaultMethod(tenantId, { label: "Default fixture payment" });
    try {
      const invoice = await draft();
      unwrap(await finalize.execute({ invoiceId: invoice.id, paymentMethodId: "" }, ctx));
      expect(await repo.findById(workspaceId, invoice.id)).toMatchObject({
        status: "ISSUED",
        paymentMethodId: null,
        paymentSnapshot: { label: "Default fixture payment" },
      });
    } finally {
      delete paymentMethodQuery.methods[`${tenantId}:default`];
    }
  });

  it("commits configured stock and journal changes with the invoice and rolls them back together", async () => {
    await prisma.accountingSettings.create({
      data: { tenantId, baseCurrency: "EUR", fiscalYearStartMonthDay: "01-01" },
    });
    const accounts = await prisma.ledgerAccount.createManyAndReturn({
      data: [
        { tenantId, code: "1500", name: "Inventory", type: "Asset" },
        {
          tenantId,
          code: "5100",
          name: "Cost of goods",
          type: "Expense",
          systemAccountKey: "COGS",
        },
      ],
    });
    const lot = await prisma.inventoryLot.create({
      data: {
        tenantId,
        productId: "fixture-stock",
        lotNumber: "LOT-1",
        receivedDate: clock.now(),
        qtyReceived: 5,
        qtyOnHand: 5,
        unitCostCents: 100,
      },
    });
    const first = await draft({
      lineItems: [
        { description: "Inventory line [product:fixture-stock]", qty: 2, unitPriceCents: 200 },
      ],
    });
    unwrap(
      await createJournalEntry.execute(
        {
          memo: "Manual invoice journal",
          postingDate: "2026-11-28",
          sourceType: "Invoice",
          sourceId: first.id,
          lines: accounts.map(({ id, type }) => ({
            ledgerAccountId: id,
            direction: type === "Asset" ? "Debit" : "Credit",
            amountCents: 50,
            currency: "EUR",
          })),
        },
        ctx
      )
    );
    const brokenAudit = vi
      .spyOn(audit, "log")
      .mockRejectedValueOnce(new Error("Synthetic audit failure"));
    try {
      await expect(finalize.execute({ invoiceId: first.id }, ctx)).rejects.toThrow(
        "Synthetic audit failure"
      );
      expect(await repo.findById(workspaceId, first.id)).toMatchObject({
        status: "DRAFT",
        revision: 0,
      });
      expect(await prisma.journalEntry.count({ where: { tenantId, sourceId: first.id } })).toBe(1);
      expect(await prisma.extKv.count({ where: { tenantId, key: first.id } })).toBe(0);
      expect(await prisma.inventoryLot.findUnique({ where: { id: lot.id } })).toMatchObject({
        qtyOnHand: 5,
      });

      const issued = unwrap(await finalize.execute({ invoiceId: first.id }, ctx)).invoice;
      expect(issued.status).toBe("ISSUED");
      expect(await prisma.journalEntry.count({ where: { tenantId, sourceId: first.id } })).toBe(2);
      expect(await prisma.inventoryLot.findUnique({ where: { id: lot.id } })).toMatchObject({
        qtyOnHand: 3,
      });
      expect(await cancel.execute({ invoiceId: first.id }, ctx)).toMatchObject({
        ok: false,
        error: { code: "CONFLICT", message: expect.stringContaining("recorded stock costs") },
      });
      // Older releases let a stock-backed invoice be canceled without reversing its journal.
      await prisma.invoice.update({ where: { id: first.id }, data: { status: "CANCELED" } });
      expect(
        await create.execute({ ...invoiceInput, correctsInvoiceId: first.id }, ctx)
      ).toMatchObject({
        ok: false,
        error: { code: "CONFLICT", message: expect.stringContaining("recorded stock costs") },
      });
      const legacyReplacement = await draft();
      await prisma.invoice.update({
        where: { id: legacyReplacement.id },
        data: { sourceType: "invoice_correction", sourceId: first.id },
      });
      expect(await finalize.execute({ invoiceId: legacyReplacement.id }, ctx)).toMatchObject({
        ok: false,
        error: { code: "CONFLICT", message: expect.stringContaining("recorded stock costs") },
      });
      expect(await repo.findById(workspaceId, legacyReplacement.id)).toMatchObject({
        status: "DRAFT",
        number: null,
      });
    } finally {
      brokenAudit.mockRestore();
    }
  });
});
