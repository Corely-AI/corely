import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoicesHttpController } from "./invoices.controller";
import { InvoicesApplication } from "../../application/invoices.application";
import { HttpException } from "@nestjs/common";
import { NotFoundError, err, ok } from "@corely/kernel";
import type { DocumentsApplication } from "../../../documents/application/documents.application";
import { HEADER_TENANT_ID } from "@shared/request-context";

const invoice = {
  id: "inv-1",
  tenantId: "tenant-1",
  number: null,
  status: "DRAFT" as const,
  customerPartyId: "cust-1",
  billToName: null,
  billToEmail: null,
  billToVatId: null,
  billToAddressLine1: null,
  billToAddressLine2: null,
  billToCity: null,
  billToPostalCode: null,
  billToCountry: null,
  currency: "USD",
  invoiceDate: null,
  dueDate: null,
  issuedAt: null,
  sentAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lineItems: [{ id: "line-1", description: "Item", qty: 1, unitPriceCents: 1000 }],
  payments: [],
  totals: {
    subtotalCents: 1000,
    taxCents: 0,
    discountCents: 0,
    totalCents: 1000,
    paidCents: 0,
    dueCents: 1000,
  },
};

describe("InvoicesHttpController", () => {
  let controller: InvoicesHttpController;
  const getExecute = vi.fn();
  const updateExecute = vi.fn();
  const sendExecute = vi.fn();
  const getInvoicePdfExecute = vi.fn();

  beforeEach(() => {
    getExecute.mockResolvedValue(ok({ invoice }));
    updateExecute.mockResolvedValue(ok({ invoice }));
    sendExecute.mockResolvedValue(ok({ invoice }));
    getInvoicePdfExecute.mockReset();

    const app = {
      getInvoiceById: { execute: getExecute },
      updateInvoice: { execute: updateExecute },
      createInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      finalizeInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      sendInvoice: { execute: sendExecute },
      recordPayment: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      cancelInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      listInvoices: {
        execute: vi.fn().mockResolvedValue(ok({ items: [invoice], nextCursor: null })),
      },
    } as unknown as InvoicesApplication;

    const docsApp = {
      getInvoicePdf: { execute: getInvoicePdfExecute },
    } as unknown as DocumentsApplication;

    controller = new InvoicesHttpController(app, null, docsApp);
  });

  it("returns invoice dto via get endpoint", async () => {
    const req = { headers: { [HEADER_TENANT_ID]: "tenant-1" } } as any;
    const result = await controller.getInvoice("inv-1", req);

    expect(result).toEqual({ invoice, capabilities: undefined });
    expect(getExecute).toHaveBeenCalledWith(
      { invoiceId: "inv-1" },
      expect.objectContaining({ tenantId: "tenant-1" })
    );
  });

  it("maps use case errors to http exceptions", async () => {
    getExecute.mockResolvedValueOnce(err(new NotFoundError("missing invoice")));
    const req = { headers: { [HEADER_TENANT_ID]: "tenant-1" } } as any;

    await expect(controller.getInvoice("missing", req)).rejects.toBeInstanceOf(HttpException);
  });

  it("returns 202 + Retry-After for pending PDF generation", async () => {
    getInvoicePdfExecute.mockResolvedValueOnce(
      ok({
        documentId: "doc-1",
        fileId: "file-1",
        status: "PENDING",
        retryAfterMs: 1200,
      })
    );

    const req = {
      headers: { [HEADER_TENANT_ID]: "tenant-1" },
      on: vi.fn(),
      off: vi.fn(),
      protocol: "http",
      get: vi.fn().mockReturnValue("localhost:3000"),
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    } as any;

    const result = await controller.downloadPdf("inv-1", "15000", undefined, req, res);

    expect(result.status).toBe("PENDING");
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "2");
  });

  it("returns READY payload for downloadable PDF", async () => {
    getInvoicePdfExecute.mockResolvedValueOnce(
      ok({
        documentId: "doc-1",
        fileId: "file-1",
        status: "READY",
        downloadUrl: "https://download.test/file.pdf",
      })
    );

    const req = {
      headers: { [HEADER_TENANT_ID]: "tenant-1" },
      on: vi.fn(),
      off: vi.fn(),
      protocol: "http",
      get: vi.fn().mockReturnValue("localhost:3000"),
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    } as any;

    const result = await controller.downloadPdf("inv-1", "15000", undefined, req, res);

    expect(result.status).toBe("READY");
    expect(result.downloadUrl).toBe("https://download.test/file.pdf");
    expect(res.status).not.toHaveBeenCalled();
  });

  it("maps FAILED PDF status to HTTP 422", async () => {
    getInvoicePdfExecute.mockResolvedValueOnce(
      ok({
        documentId: "doc-1",
        fileId: "file-1",
        status: "FAILED",
        errorMessage: "Render error",
      })
    );

    const req = {
      headers: { [HEADER_TENANT_ID]: "tenant-1" },
      on: vi.fn(),
      off: vi.fn(),
      protocol: "http",
      get: vi.fn().mockReturnValue("localhost:3000"),
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    } as any;

    await expect(
      controller.downloadPdf("inv-1", "15000", undefined, req, res)
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("waits for PDF readiness before sending when attachPdf=true", async () => {
    getInvoicePdfExecute.mockResolvedValueOnce(
      ok({
        documentId: "doc-1",
        fileId: "file-1",
        status: "READY",
        downloadUrl: "https://download.test/file.pdf",
      })
    );

    const req = { headers: { [HEADER_TENANT_ID]: "tenant-1" } } as any;
    const result = await controller.send(
      "inv-1",
      { to: "customer@example.com", subject: "Invoice" },
      req
    );

    expect(result).toEqual({ invoice });
    expect(getInvoicePdfExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        waitMs: 90000,
      }),
      expect.objectContaining({ tenantId: "tenant-1" })
    );
    expect(sendExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        to: "customer@example.com",
        attachPdf: true,
      }),
      expect.objectContaining({ tenantId: "tenant-1" })
    );
  });

  it("returns conflict when PDF is still pending during send", async () => {
    getInvoicePdfExecute.mockResolvedValueOnce(
      ok({
        documentId: "doc-1",
        fileId: "file-1",
        status: "PENDING",
        retryAfterMs: 1000,
      })
    );

    const req = { headers: { [HEADER_TENANT_ID]: "tenant-1" } } as any;

    await expect(
      controller.send("inv-1", { to: "customer@example.com", attachPdf: true }, req)
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it("skips PDF readiness check when attachPdf=false", async () => {
    const req = { headers: { [HEADER_TENANT_ID]: "tenant-1" } } as any;

    await controller.send("inv-1", { to: "customer@example.com", attachPdf: false }, req);

    expect(getInvoicePdfExecute).not.toHaveBeenCalled();
    expect(sendExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        attachPdf: false,
      }),
      expect.objectContaining({ tenantId: "tenant-1" })
    );
  });
});
