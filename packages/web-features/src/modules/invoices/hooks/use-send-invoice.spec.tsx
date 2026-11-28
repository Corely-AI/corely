import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceDtoSchema } from "@corely/contracts";
import { useSendInvoice } from "./use-send-invoice";

const api = vi.hoisted(() => ({
  getInvoice: vi.fn(),
  finalizeInvoice: vi.fn(),
  sendInvoice: vi.fn(),
}));
vi.mock("../invoice-runtime", () => ({
  useInvoicesApi: () => api,
  useInvoiceKeys: () => ({ all: () => ["invoices"], detail: (id: string) => ["invoices", id] }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const invoice = InvoiceDtoSchema.parse({
  id: "invoice-1",
  tenantId: "workspace-a",
  status: "DRAFT",
  customerPartyId: "customer-1",
  currency: "EUR",
  createdAt: "2026-11-09T10:00:00Z",
  updatedAt: "2026-11-09T10:00:00Z",
  number: null,
  invoiceDate: null,
  dueDate: null,
  issuedAt: null,
  sentAt: null,
  lineItems: [],
  totals: {
    subtotalCents: 100,
    totalCents: 100,
    taxCents: 0,
    discountCents: 0,
    paidCents: 0,
    dueCents: 100,
  },
});
const data = {
  to: "synthetic@example.invalid",
  subject: "Reviewed invoice",
  message: "Reviewed message",
  sendCopy: false,
};
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useSendInvoice(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.getInvoice.mockResolvedValue({ invoice: { ...invoice, status: "ISSUED" } });
  api.finalizeInvoice.mockResolvedValue(undefined);
  api.sendInvoice.mockResolvedValue(undefined);
});
describe("reviewed invoice delivery retries", () => {
  it("reuses a delivery key after an uncertain response and does not finalize the same draft twice", async () => {
    const { result } = setup();
    api.getInvoice.mockResolvedValueOnce({ invoice });
    api.sendInvoice.mockRejectedValueOnce(new Error("Response lost after queuing delivery"));
    await act(async () => {
      await result.current.openSendDialog(invoice);
    });
    await act(async () => {
      await result.current.handleSend(data);
    });
    expect(result.current.isOpen).toBe(true);
    await act(async () => {
      await result.current.handleSend(data);
    });
    expect(result.current.isOpen).toBe(false);
    expect(api.finalizeInvoice).toHaveBeenCalledTimes(1);
    expect(api.getInvoice).toHaveBeenCalledTimes(2);
    const firstKey: unknown = api.sendInvoice.mock.calls[0][1].idempotencyKey;
    expect(firstKey).toBeTypeOf("string");
    expect(api.sendInvoice.mock.calls[1][1].idempotencyKey).toBe(firstKey);
  });
  it("uses a new delivery key for a changed reviewed message and for a later successful resend", async () => {
    const { result } = setup();
    api.sendInvoice.mockRejectedValueOnce(new Error("Response lost"));
    await act(async () => {
      await result.current.openSendDialog(invoice);
    });
    await act(async () => {
      await result.current.handleSend(data);
    });
    await act(async () => {
      await result.current.handleSend({ ...data, message: "Changed reviewed message" });
    });
    const firstKey: unknown = api.sendInvoice.mock.calls[0][1].idempotencyKey;
    const changedKey: unknown = api.sendInvoice.mock.calls[1][1].idempotencyKey;
    expect(firstKey).toBeTypeOf("string");
    expect(changedKey).not.toBe(firstKey);
    await act(async () => {
      await result.current.openSendDialog(invoice);
    });
    await act(async () => {
      await result.current.handleSend({ ...data, message: "Changed reviewed message" });
    });
    expect(api.sendInvoice.mock.calls[2][1].idempotencyKey).not.toBe(changedKey);
  });
  it("keeps an uncertain delivery key while another invoice is sent from the same list", async () => {
    const { result } = setup();
    api.sendInvoice.mockRejectedValueOnce(new Error("Response lost"));
    await act(async () => {
      await result.current.openSendDialog(invoice);
    });
    await act(async () => {
      await result.current.handleSend(data);
    });
    const firstKey: unknown = api.sendInvoice.mock.calls[0][1].idempotencyKey;
    await act(async () => {
      await result.current.openSendDialog({ ...invoice, id: "invoice-2" });
    });
    await act(async () => {
      await result.current.handleSend(data);
    });
    await act(async () => {
      await result.current.openSendDialog(invoice);
    });
    await act(async () => {
      await result.current.handleSend(data);
    });
    expect(api.sendInvoice.mock.calls[2][1].idempotencyKey).toBe(firstKey);
  });
});
