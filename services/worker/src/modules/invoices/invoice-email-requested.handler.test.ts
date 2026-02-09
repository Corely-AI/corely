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
  });

  it("sends email via port and marks delivery sent", async () => {
    const sender = new FakeEmailSender();
    const handler = new InvoiceEmailRequestedHandler(
      sender,
      invoiceRepo as any,
      deliveryRepo as any
    );

    await handler.handle(baseEvent as any);

    expect(sender.calls[0].to).toEqual(["customer@example.com"]);
    expect(deliveryRepo.updateStatus).toHaveBeenCalledWith("tenant-1", "delivery-1", "SENT", {
      providerMessageId: "msg-123",
    });
  });

  it("marks delivery failed when provider errors", async () => {
    const sender = new FakeEmailSender(true);
    const handler = new InvoiceEmailRequestedHandler(
      sender,
      invoiceRepo as any,
      deliveryRepo as any
    );

    await expect(handler.handle(baseEvent as any)).rejects.toThrow("send fail");
    expect(deliveryRepo.updateStatus).toHaveBeenCalledWith("tenant-1", "delivery-1", "FAILED", {
      lastError: "send fail",
    });
  });
});
