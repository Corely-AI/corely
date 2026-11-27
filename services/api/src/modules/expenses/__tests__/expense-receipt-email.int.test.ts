import { randomUUID, createHmac } from "node:crypto";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { describe, beforeAll, afterAll, expect, it, vi } from "vitest";
import type { EnvService } from "@corely/config";
import {
  CustomFieldDefinitionRepository,
  CustomFieldIndexRepository,
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaService,
  PrismaUnitOfWork,
} from "@corely/data";
import { isRestrictedDocumentId } from "@corely/domain";
import { FakeObjectStoragePort } from "../../documents/testkit/fakes/fake-object-storage";
import { ExpenseReceiptDocumentsAdapter } from "../../documents/infrastructure/prisma/expense-receipt-documents.adapter";
import { PrivateEmailOriginalsAdapter } from "../../documents/infrastructure/prisma/private-email-originals.adapter";
import { MockIdempotencyStoragePort } from "../../../shared/testkit/mocks/mock-idempotency-port";
import { ExpenseReceiptEmail } from "../application/expense-receipt-email";
import { PrismaExpenseReceiptDraftStore } from "../infrastructure/adapters/prisma-expense-receipt-draft-store";
import { PrismaExpenseRepository } from "../infrastructure/adapters/prisma-expense-repository.adapter";
import { CreateExpenseUseCase } from "../application/use-cases/create-expense.usecase";
import { TransitionExpenseUseCase } from "../application/use-cases/transition-expense.usecase";
import { ExpenseReceiptWebhookController } from "../http/expense-receipt-webhook.controller";

const database = process.env.EXPENSE_RECEIPT_TEST_DATABASE_URL;
const tenantId = randomUUID();
const workspaceId = randomUUID();
const claimant = { tenantId, workspaceId, userId: randomUUID(), canReview: false, canWrite: true };
const reviewer = { ...claimant, userId: randomUUID(), canReview: true };
const otherWorkspace = { ...claimant, workspaceId: randomUUID() };
const unexpected = () => {
  throw new Error("Unexpected custom attribute write");
};

describe.skipIf(!database)("emailed expenses in disposable PostgreSQL", () => {
  let prisma: PrismaService;
  let receipts: ExpenseReceiptEmail;
  let webhook: ExpenseReceiptWebhookController;
  const slug = "workspacexyz";
  const domain = "expense.corely.one";
  const shared = `${slug}@${domain}`;
  const key = Buffer.from("synthetic-expense-webhook");
  const secret = `whsec_${key.toString("base64")}`;
  const pdf = { id: "pdf", filename: "parking.pdf", content_type: "application/pdf" };
  const png = { id: "png", filename: "supplies.png", content_type: "image/png" };
  const download = vi.fn(async (_: string, id: string) =>
    id === "pdf" ? Buffer.from("%PDF-1.7\n") : Buffer.from("89504e470d0a1a0a", "hex")
  );
  const storage = new FakeObjectStoragePort();
  const env = {
    RESEND_API_KEY: "synthetic-unused",
    getValue: (name: string) => (name === "EXPENSE_EMAIL_DOMAIN" ? domain : secret),
  } as EnvService;

  beforeAll(async () => {
    const url = new URL(database!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.startsWith("/corely_516_test")
    ) {
      throw new Error("Use a disposable local corely_516_test database");
    }
    process.env.DATABASE_URL = database;
    prisma = new PrismaService();
    await prisma.$connect();
    const audit = new PrismaAuditAdapter(prisma);
    const outbox = new PrismaOutboxAdapter(prisma);
    const repo = new PrismaExpenseRepository(prisma);
    const create = new CreateExpenseUseCase(
      repo,
      outbox,
      audit,
      new MockIdempotencyStoragePort(),
      { newId: randomUUID },
      { now: () => new Date() },
      new CustomFieldDefinitionRepository(prisma),
      new CustomFieldIndexRepository(prisma),
      { setEntityAssignments: unexpected, deleteEntityAssignments: unexpected },
      { setEntityValues: unexpected, deleteEntityValues: unexpected },
      prisma,
      { sumGiftsByRecipientForYear: async () => 0 }
    );
    const transition = new TransitionExpenseUseCase(repo, audit, outbox);
    receipts = new ExpenseReceiptEmail({
      store: new PrismaExpenseReceiptDraftStore(prisma, new PrismaExtKvAdapter(prisma)),
      unitOfWork: new PrismaUnitOfWork(prisma),
      documents: new ExpenseReceiptDocumentsAdapter(
        new PrivateEmailOriginalsAdapter(prisma, storage, env)
      ),
      audit,
      log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      domain,
      secret,
      download,
      tenantForWorkspace: async (id) => (id === workspaceId ? tenantId : null),
      workspaceForSlug: async (name) => (name === slug ? claimant : null),
      canClaim: async (scope, userId) =>
        scope.workspaceId === workspaceId && userId === claimant.userId,
      submit: async (actor, input, tx) => {
        const expense = await create.createFromReceipt(input, actor, tx);
        await transition.submitFromReceipt(expense, actor, tx);
      },
    });
    webhook = new ExpenseReceiptWebhookController(receipts, env);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.onModuleDestroy();
    }
  });

  const deliver = (emailId: string, to: string, attachments: object[], valid = true) => {
    const id = randomUUID();
    const timestamp = String(Math.floor(Date.now() / 1000));
    const payload = JSON.stringify({
      type: "email.received",
      data: { email_id: emailId, from: "untrusted@example.invalid", to: [to], attachments },
    });
    const signature = createHmac("sha256", key)
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

  it("imports per attachment, protects drafts and submits exactly one real expense", async () => {
    expect(await receipts.settings(reviewer, slug)).toMatchObject({
      enabled: false,
      address: shared,
    });
    await deliver("disabled", shared, [pdf]);
    await expect(deliver("unsigned", shared, [pdf], false)).rejects.toMatchObject({ status: 401 });
    expect(download).not.toHaveBeenCalled();
    await receipts.setEnabled(reviewer, slug, true);
    download.mockRejectedValueOnce(new Error("temporary provider failure"));
    const inline = { ...png, id: "logo", content_disposition: "inline" };
    const unsupported = { ...pdf, id: "text", content_type: "text/plain" };
    await expect(deliver("shared", shared, [pdf, png, inline, unsupported])).rejects.toMatchObject({
      status: 503,
    });
    expect((await receipts.list(reviewer)).items.map(({ filename }) => filename)).toEqual([
      png.filename,
    ]);
    await Promise.all([
      deliver("shared", shared, [pdf, png]),
      deliver("shared", shared, [pdf, png]),
    ]);
    expect((await receipts.list(reviewer)).items.map(({ filename }) => filename).sort()).toEqual(
      [pdf.filename, png.filename].sort()
    );
    expect((await receipts.list(claimant)).items).toEqual([]);
    expect((await receipts.list(otherWorkspace)).items).toEqual([]);
    expect(storage.objects.size).toBe(2);

    const draft = (await receipts.list(reviewer)).items.find(
      ({ filename }) => filename === pdf.filename
    )!;
    expect(draft).toMatchObject({ claimantUserId: null, expenseDate: null, amountCents: null });
    await expect(receipts.original(claimant, draft.id)).rejects.toThrow("Receipt draft not found");
    await expect(
      receipts.assign(reviewer, draft.id, otherWorkspace.userId + "-unknown")
    ).rejects.toThrow("authorized reviewer");
    await receipts.assign(reviewer, draft.id, claimant.userId);
    await expect(receipts.original(otherWorkspace, draft.id)).rejects.toThrow(
      "Receipt draft not found"
    );
    expect((await receipts.original(claimant, draft.id)).url).toContain(draft.id);
    await expect(receipts.original(reviewer, draft.id)).rejects.toThrow("Receipt draft not found");
    const document = await prisma.document.findFirstOrThrow({ where: { tenantId } });
    expect(isRestrictedDocumentId(document.id)).toBe(true);
    const complete = {
      merchant: "Parking garage",
      expenseDate: "2026-11-27",
      amountCents: 2500,
      currency: "EUR",
      category: "travel",
    };
    await expect(
      receipts.update(claimant, draft.id, { ...complete, currency: null }, true)
    ).rejects.toThrow("Complete the merchant");
    expect(await prisma.expense.count({ where: { tenantId: workspaceId } })).toBe(0);
    await receipts.update(claimant, draft.id, { ...complete, currency: null }, false);
    const submitted = await Promise.all([
      receipts.update(claimant, draft.id, complete, true),
      receipts.update(claimant, draft.id, complete, true),
    ]);
    expect(submitted.map(({ submittedExpenseId }) => submittedExpenseId)).toEqual([
      draft.id,
      draft.id,
    ]);
    expect(await prisma.expense.findMany({ where: { tenantId: workspaceId } })).toMatchObject([
      {
        id: draft.id,
        status: "SUBMITTED",
        totalAmountCents: 2500,
        createdByUserId: claimant.userId,
      },
    ]);

    expect((await receipts.original(reviewer, draft.id)).url).toContain(draft.id);

    const personal = (await receipts.enablePersonal(claimant, slug)).personalAddress!;
    await deliver("personal", personal, [png]);
    expect((await receipts.list(claimant)).items).toHaveLength(2);
    await receipts.setEnabled(reviewer, slug, false);
    await deliver("turned-off", personal, [pdf]);
    expect((await receipts.list(claimant)).items).toHaveLength(2);
  });
});
