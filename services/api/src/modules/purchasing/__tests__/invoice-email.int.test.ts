import { createHmac, randomUUID } from "node:crypto";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import type { PartyDto } from "@corely/contracts";
import type { EnvService } from "@corely/config";
import { PrismaExtKvAdapter, PrismaService, PrismaUnitOfWork } from "@corely/data";
import { isRestrictedDocumentId } from "@corely/domain";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { FakeObjectStoragePort } from "../../documents/testkit/fakes/fake-object-storage";
import { VendorBillDocumentsAdapter } from "../../documents/infrastructure/prisma/vendor-bill-documents.adapter";
import { InvoiceEmailWebhookController } from "../adapters/http/invoice-email-webhook.controller";
import { InvoiceEmailIntake } from "../application/invoice-email-intake";
import { UpdateVendorBillUseCase } from "../application/use-cases/update-vendor-bill.usecase";
import type { VendorBillDeps } from "../application/use-cases/purchasing-bill.deps";
import { ApproveVendorBillUseCase } from "../application/use-cases/approve-vendor-bill.usecase";
import { InvoiceEmailSettingsAdapter } from "../infrastructure/adapters/invoice-email-settings.adapter";
import { PrismaVendorBillRepository } from "../infrastructure/adapters/prisma-vendor-bill-repository.adapter";

const database = process.env.INVOICE_EMAIL_TEST_DATABASE_URL;
const tenantId = randomUUID();
const workspaceId = randomUUID();
const otherWorkspace = randomUUID();
const scope = { tenantId, workspaceId };
const otherScope = { tenantId, workspaceId: otherWorkspace };
const userId = randomUUID();
const supplierId = randomUUID();

describe.skipIf(!database)("incoming invoice email against disposable PostgreSQL", () => {
  const domain = "invoices.example.invalid";
  const signatureKey = Buffer.from("synthetic-webhook-secret");
  const secret = `whsec_${signatureKey.toString("base64")}`;
  const env = {
    INVOICE_EMAIL_DOMAIN: domain,
    INVOICE_EMAIL_RESEND_WEBHOOK_SECRET: secret,
    RESEND_API_KEY: "synthetic-unused",
    STORAGE_KEY_PREFIX: "",
  } as EnvService;

  const pdf = { id: "pdf", filename: "supplier-invoice.pdf", content_type: "application/pdf" };
  const image = { id: "image", filename: "supplier-invoice.png", content_type: "image/png" };
  const inline = { ...image, id: "logo", content_disposition: "inline" };
  const unsupported = { ...pdf, id: "text", content_type: "text/plain" };
  const malformed = { ...pdf, id: "malformed" };
  const download = vi.fn(async (_emailId: string, id: string) => {
    if (id === "image") {
      return Buffer.from("89504e470d0a1a0a0000", "hex");
    }
    return Buffer.from(id === "pdf" ? "%PDF-1.7\n" : "invalid attachment");
  });
  const storage = new FakeObjectStoragePort();
  const clock = { now: () => new Date() };
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const audit = { log: vi.fn(async () => {}) };
  const supplierQuery = {
    listSuppliers: vi.fn(async () => ({ suppliers: [] })),
    getSupplierById: vi.fn(async (_tenant: string, id: string) =>
      id === supplierId
        ? ({
            id,
            tenantId,
            kind: "ORGANIZATION",
            displayName: "Example Supplier",
            lifecycleStatus: "ACTIVE",
            roles: ["SUPPLIER"],
            vatId: null,
            notes: null,
            tags: [],
            archivedAt: null,
            createdAt: "2026-11-27T08:00:00.000Z",
            updatedAt: "2026-11-27T08:00:00.000Z",
          } satisfies PartyDto)
        : null
    ),
  };
  let prisma: PrismaService;
  let bills: PrismaVendorBillRepository;
  let intake: InvoiceEmailIntake;
  let webhook: InvoiceEmailWebhookController;

  beforeAll(async () => {
    const target = new URL(database!);
    if (
      !["127.0.0.1", "localhost"].includes(target.hostname) ||
      !/^\/corely_509_test(?:_\w+)?$/.test(target.pathname)
    ) {
      throw new Error(
        "INVOICE_EMAIL_TEST_DATABASE_URL must point to a local corely_509_test database"
      );
    }
    process.env.DATABASE_URL = database;
    prisma = new PrismaService();
    await prisma.$connect();
    bills = new PrismaVendorBillRepository(prisma);
    intake = new InvoiceEmailIntake({
      bills,
      documents: new VendorBillDocumentsAdapter(prisma, storage, env),
      settings: new InvoiceEmailSettingsAdapter(new PrismaExtKvAdapter(prisma)),
      findActiveTenant: async (id) =>
        [workspaceId, otherWorkspace].includes(id) ? tenantId : null,
      download,
      clock,
      logger,
      unitOfWork: new PrismaUnitOfWork(prisma),
      audit,
      domain,
    });
    webhook = new InvoiceEmailWebhookController(intake, env);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.file.deleteMany({ where: { tenantId } });
      await prisma.document.deleteMany({ where: { tenantId } });
      await prisma.vendorBill.deleteMany({ where: { tenantId } });
      await prisma.extKv.deleteMany({ where: { tenantId } });
      await prisma.onModuleDestroy();
    }
  });

  const event = (emailId: string, to: string[], attachments: object[]) => ({
    type: "email.received",
    data: { email_id: emailId, to, attachments },
  });

  const deliver = (delivery: ReturnType<typeof event>, valid = true) => {
    const id = randomUUID();
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify(delivery);
    const signature = createHmac("sha256", signatureKey)
      .update(`${id}.${timestamp}.${payload}`)
      .digest("base64");
    const headers: Record<string, string> = {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${valid ? signature : "invalid"}`,
    };
    return webhook.receive({
      rawBody: Buffer.from(payload),
      header: (name: string) => headers[name],
    } as RawBodyRequest<Request>);
  };

  it("routes signed mail, retries only missing files, protects originals, and advances an edited draft", async () => {
    const address = `invoice+${workspaceId}@${domain}`;
    const inactive = `invoice+${otherWorkspace}@${domain}`;
    expect(await intake.getSettings(scope)).toEqual({ available: true, enabled: false, address });
    await deliver(event("inactive", [address, inactive], [pdf]));
    expect(download).not.toHaveBeenCalled();
    await intake.setEnabled(scope, userId, true);
    await expect(deliver(event("unsigned", [address], [pdf]), false)).rejects.toMatchObject({
      status: 401,
    });
    expect(download).not.toHaveBeenCalled();

    const delivery = event(
      "mixed",
      [address, inactive, address.toUpperCase()],
      [pdf, image, inline, unsupported, malformed]
    );
    download.mockRejectedValueOnce(new Error("Provider interrupted the download"));
    await expect(deliver(delivery)).rejects.toMatchObject({ status: 503 });
    expect(
      (await bills.list(tenantId, { workspaceId })).items.map((bill) => bill.sourceFilename)
    ).toEqual([image.filename]);
    await Promise.all([deliver(delivery), deliver(delivery)]);
    const list = (await bills.list(tenantId, { workspaceId })).items;
    expect(list.map((bill) => bill.sourceFilename).sort()).toEqual(
      [pdf.filename, image.filename].sort()
    );
    const callsAfterRetry = download.mock.calls.length;
    await deliver(event("mixed", [address], [pdf, image]));
    expect(download.mock.calls.length).toBe(callsAfterRetry);
    expect(storage.objects.size).toBe(2);
    expect(logger.warn).toHaveBeenCalledWith(
      "Invoice email attachment import failed",
      expect.objectContaining({ attachmentId: "pdf" })
    );
    expect(download.mock.calls.map(([, id]) => id)).not.toContain("logo");
    expect(download.mock.calls.map(([, id]) => id)).not.toContain("text");

    const draft = list.find((bill) => bill.sourceFilename === pdf.filename)!;
    expect(draft).toMatchObject({
      status: "DRAFT",
      supplierPartyId: null,
      billDate: null,
      currency: null,
      lineItems: [],
    });
    expect(
      (await bills.list(tenantId, { workspaceId: otherWorkspace, search: pdf.filename })).items
    ).toEqual([]);
    expect(await bills.findById(tenantId, draft.id, otherWorkspace)).toBeNull();
    await expect(intake.original(otherScope, draft.id)).rejects.toThrow(
      "Original invoice not found"
    );
    expect((await intake.original(scope, draft.id)).url).toContain(draft.id);
    const documents = await prisma.document.findMany({ where: { tenantId } });
    expect(documents).toHaveLength(2);
    expect(documents.every(({ id }) => isRestrictedDocumentId(id))).toBe(true);

    const deps: VendorBillDeps = {
      logger,
      repo: bills,
      clock,
      audit,
      supplierQuery,
      idGenerator: { newId: randomUUID },
      get settingsRepo(): never {
        throw new Error("Unexpected settings access");
      },
      get mappingRepo(): never {
        throw new Error("Unexpected mapping access");
      },
      get idempotency(): never {
        throw new Error("Unexpected idempotency access");
      },
      get accounting(): never {
        throw new Error("Unexpected accounting operation");
      },
    };
    const approve = new ApproveVendorBillUseCase(deps);
    const update = new UpdateVendorBillUseCase(deps);
    const ctx = { ...scope, userId };
    const command = { vendorBillId: draft.id };
    expect(await approve.execute(command, ctx)).toHaveProperty("error");
    const edits = {
      ...command,
      headerPatch: {
        supplierPartyId: supplierId,
        billNumber: "INV-42",
        billDate: "2026-11-27",
        dueDate: "2026-12-11",
        currency: "EUR",
      },
      lineItems: [{ description: "Supplies", quantity: 1, unitCostCents: 2500 }],
    };
    expect(await update.execute(edits, { ...otherScope, userId })).toHaveProperty("error");
    expect(await update.execute(edits, ctx)).toHaveProperty("value.vendorBill.status", "DRAFT");
    expect(await approve.execute(command, ctx)).toHaveProperty(
      "value.vendorBill.status",
      "APPROVED"
    );
    expect(await bills.findById(tenantId, draft.id, workspaceId)).toMatchObject({
      status: "APPROVED",
      billNumber: "INV-42",
    });
    await deliver(delivery);
    expect(await bills.findById(tenantId, draft.id, workspaceId)).toMatchObject({
      status: "APPROVED",
      billNumber: "INV-42",
    });

    await intake.setEnabled(scope, userId, false);
    await deliver(event("disabled", [address], [pdf]));
    expect((await bills.list(tenantId, { workspaceId })).items).toHaveLength(2);
  });
});
