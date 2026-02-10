import { beforeEach, describe, expect, it } from "vitest";
import { FixedClock, NoopLogger, unwrap } from "@corely/kernel";
import { RequestInvoicePdfUseCase } from "../request-invoice-pdf/request-invoice-pdf.usecase";
import { GetInvoicePdfUseCase } from "./get-invoice-pdf.usecase";
import { InMemoryDocumentRepo } from "../../../testkit/fakes/in-memory-document-repo";
import { InMemoryFileRepo } from "../../../testkit/fakes/in-memory-file-repo";
import { InMemoryDocumentLinkRepo } from "../../../testkit/fakes/in-memory-document-link-repo";
import { FakeObjectStoragePort } from "../../../testkit/fakes/fake-object-storage";
import { FakeOutboxPort } from "../../../testkit/fakes/fake-outbox";

class TestIdGenerator {
  private counter = 0;

  newId() {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

describe("GetInvoicePdfUseCase", () => {
  const tenantId = "tenant-1";
  const ctx = { tenantId };

  let documentRepo: InMemoryDocumentRepo;
  let fileRepo: InMemoryFileRepo;
  let linkRepo: InMemoryDocumentLinkRepo;
  let storage: FakeObjectStoragePort;
  let outbox: FakeOutboxPort;
  let requestUseCase: RequestInvoicePdfUseCase;
  let waitUseCase: GetInvoicePdfUseCase;

  beforeEach(() => {
    documentRepo = new InMemoryDocumentRepo();
    fileRepo = new InMemoryFileRepo();
    linkRepo = new InMemoryDocumentLinkRepo(documentRepo);
    storage = new FakeObjectStoragePort();
    outbox = new FakeOutboxPort();

    requestUseCase = new RequestInvoicePdfUseCase({
      logger: new NoopLogger(),
      documentRepo,
      fileRepo,
      linkRepo,
      objectStorage: storage,
      outbox,
      idGenerator: new TestIdGenerator() as any,
      clock: new FixedClock(new Date("2025-01-01T00:00:00.000Z")),
      downloadTtlSeconds: 600,
      keyPrefix: "env/test",
    });

    waitUseCase = new GetInvoicePdfUseCase({
      logger: new NoopLogger(),
      requestInvoicePdf: requestUseCase,
      documentRepo,
      fileRepo,
      objectStorage: storage,
      downloadTtlSeconds: 600,
      defaultWaitMs: 15000,
      maxWaitMs: 30000,
      pollInitialMs: 20,
      pollMaxMs: 100,
      pollJitterMs: 0,
      pendingRetryAfterMs: 1000,
    });
  });

  it("returns READY immediately when PDF is already available", async () => {
    const first = unwrap(await requestUseCase.execute({ invoiceId: "inv-ready" }, ctx));
    const document = await documentRepo.findById(tenantId, first.documentId);
    const file = await fileRepo.findById(tenantId, first.fileId!);

    if (!document || !file) {
      throw new Error("test setup failed");
    }

    document.markReady(new Date());
    storage.objects.set(file.objectKey, {
      key: file.objectKey,
      contentType: "application/pdf",
      bytes: Buffer.from("pdf"),
    });

    const eventCountBefore = outbox.events.length;
    const result = unwrap(await waitUseCase.execute({ invoiceId: "inv-ready", waitMs: 200 }, ctx));

    expect(result.status).toBe("READY");
    expect(result.downloadUrl).toContain(file.objectKey);
    expect(outbox.events).toHaveLength(eventCountBefore);
  });

  it("waits for READY and returns within wait window", async () => {
    const first = unwrap(await requestUseCase.execute({ invoiceId: "inv-eventual" }, ctx));
    const document = await documentRepo.findById(tenantId, first.documentId);
    const file = await fileRepo.findById(tenantId, first.fileId!);

    if (!document || !file) {
      throw new Error("test setup failed");
    }

    setTimeout(() => {
      document.markReady(new Date());
      storage.objects.set(file.objectKey, {
        key: file.objectKey,
        contentType: "application/pdf",
        bytes: Buffer.from("pdf"),
      });
    }, 30);

    const result = unwrap(
      await waitUseCase.execute({ invoiceId: "inv-eventual", waitMs: 500 }, ctx)
    );

    expect(result.status).toBe("READY");
    expect(result.downloadUrl).toContain(file.objectKey);
  });

  it("returns PENDING with retryAfterMs when wait budget is exhausted", async () => {
    const result = unwrap(await waitUseCase.execute({ invoiceId: "inv-timeout", waitMs: 50 }, ctx));

    expect(result.status).toBe("PENDING");
    expect(result.retryAfterMs).toBe(1000);
  });

  it("returns FAILED when renderer marks the document as failed while waiting", async () => {
    const first = unwrap(await requestUseCase.execute({ invoiceId: "inv-fail" }, ctx));
    const document = await documentRepo.findById(tenantId, first.documentId);

    if (!document) {
      throw new Error("test setup failed");
    }

    setTimeout(() => {
      document.markFailed("Playwright crashed", new Date());
    }, 30);

    const result = unwrap(await waitUseCase.execute({ invoiceId: "inv-fail", waitMs: 500 }, ctx));

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("Playwright crashed");
  });
});
