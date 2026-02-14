import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceEmailRequestedHandler } from "./invoice-email-requested.handler";
import { type EmailSenderPort } from "@corely/kernel";

class FakeEmailSender implements EmailSenderPort {
  calls: any[] = [];
  constructor(private shouldFail = false) {}

  async sendEmail(request: any) {
    this.calls.push(request);
    if (this.shouldFail) {
      throw new Error("send fail");
    }
    return { provider: "resend", providerMessageId: "msg-123" };
  }
}

const baseEvent = {
  id: "evt-1",
  eventType: "invoice.email.requested",
  payload: {
    deliveryId: "delivery-1",
    invoiceId: "inv-1",
    to: "customer@example.com",
    cc: ["cc@example.com"],
    bcc: ["bcc@example.com"],
    idempotencyKey: "key-1",
  },
  tenantId: "tenant-1",
  correlationId: "corr-1",
};

describe("InvoiceEmailRequestedHandler", () => {
  const invoiceRepo = {
    findInvoiceWithLines: vi.fn(),
    findWorkspaceSlug: vi.fn(),
  };
  const documentRepo = {
    findByTypeAndEntityLink: vi.fn(),
  };
  const fileRepo = {
    findByDocumentAndKind: vi.fn(),
    findByDocument: vi.fn(),
  };
  const objectStorage = {
    headObject: vi.fn(),
    createSignedDownloadUrl: vi.fn(),
  };
  const deliveryRepo = {
    findById: vi.fn(),
    updateStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    deliveryRepo.findById.mockResolvedValue({
      id: "delivery-1",
      tenantId: "tenant-1",
      invoiceId: "inv-1",
      to: "customer@example.com",
      status: "QUEUED",
    });
    invoiceRepo.findInvoiceWithLines.mockResolvedValue({
      id: "inv-1",
      tenantId: "tenant-1",
      number: "INV-001",
      currency: "USD",
      dueDate: new Date("2025-01-10T00:00:00Z"),
      billToName: "Customer",
      lines: [
        { id: "line-1", invoiceId: "inv-1", description: "Work", qty: 1, unitPriceCents: 1000 },
      ],
    });
    invoiceRepo.findWorkspaceSlug.mockResolvedValue("test-workspace");
    documentRepo.findByTypeAndEntityLink.mockResolvedValue({
      id: "doc-1",
      status: "READY",
    });
    fileRepo.findByDocumentAndKind.mockResolvedValue({
      id: "file-1",
      kind: "GENERATED",
      objectKey: "tenant/tenant-1/invoices/inv-1/invoice.pdf",
    });
    fileRepo.findByDocument.mockResolvedValue([]);
    objectStorage.headObject.mockResolvedValue({ exists: true });
    objectStorage.createSignedDownloadUrl.mockResolvedValue({
      url: "https://storage.example.com/invoice.pdf",
      expiresAt: new Date("2026-02-10T00:00:00.000Z"),
    });
  });

  it("sends email via port and marks delivery sent", async () => {
    const sender = new FakeEmailSender();
    const handler = new InvoiceEmailRequestedHandler(
      sender,
      invoiceRepo as any,
      deliveryRepo as any,
      documentRepo as any,
      fileRepo as any,
      objectStorage as any
    );

    await handler.handle(baseEvent as any);

    expect(sender.calls[0].to).toEqual(["customer@example.com"]);
    expect(sender.calls[0].html).toContain("http://localhost:8083/w/test-workspace");
    expect(deliveryRepo.updateStatus).toHaveBeenCalledWith("tenant-1", "delivery-1", "SENT", {
      providerMessageId: "msg-123",
    });
  });

  it("marks delivery failed when provider errors", async () => {
    const sender = new FakeEmailSender(true);
    const handler = new InvoiceEmailRequestedHandler(
      sender,
      invoiceRepo as any,
      deliveryRepo as any,
      documentRepo as any,
      fileRepo as any,
      objectStorage as any
    );

    await expect(handler.handle(baseEvent as any)).rejects.toThrow("send fail");
    expect(deliveryRepo.updateStatus).toHaveBeenCalledWith("tenant-1", "delivery-1", "FAILED", {
      lastError: "send fail",
    });
  });

  it("attaches invoice PDF when attachPdf is true", async () => {
    const sender = new FakeEmailSender();
    const handler = new InvoiceEmailRequestedHandler(
      sender,
      invoiceRepo as any,
      deliveryRepo as any,
      documentRepo as any,
      fileRepo as any,
      objectStorage as any
    );

    await handler.handle({
      ...baseEvent,
      payload: {
        ...baseEvent.payload,
        attachPdf: true,
      },
    } as any);

    expect(sender.calls[0].attachments).toEqual([
      {
        filename: "Invoice-INV-001.pdf",
        path: "https://storage.example.com/invoice.pdf",
        mimeType: "application/pdf",
      },
    ]);
  });
});
