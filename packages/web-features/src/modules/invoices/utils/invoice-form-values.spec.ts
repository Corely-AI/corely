import { afterEach, describe, expect, it, vi } from "vitest";
import { InvoiceDtoSchema } from "@corely/contracts";
import { invoiceFormValues } from "./invoice-form-values";
import { invoiceFormSchema, toCreateInvoiceInput } from "../schemas/invoice-form.schema";
const invoice = InvoiceDtoSchema.parse({
  id: "draft",
  tenantId: "workspace-a",
  number: null,
  status: "DRAFT",
  customerPartyId: "customer-a",
  currency: "EUR",
  invoiceDate: "2026-11-09",
  dueDate: "2026-11-30",
  issuedAt: null,
  sentAt: null,
  createdAt: "2026-11-09T10:00:00Z",
  updatedAt: "2026-11-09T10:00:00Z",
  lineItems: [{ id: "line-a", description: "Existing work", qty: 2, unitPriceCents: 15000 }],
  totals: {
    subtotalCents: 30000,
    taxCents: 0,
    discountCents: 0,
    totalCents: 30000,
    paidCents: 0,
    dueCents: 30000,
  },
});
afterEach(() => vi.unstubAllEnvs());
describe("existing invoice editor projection", () => {
  it("allows an unnumbered draft to validate without adding a client number to its command", () => {
    const form = invoiceFormSchema.parse(invoiceFormValues(invoice));
    expect(form.invoiceNumber).toBeTruthy();
    const command = toCreateInvoiceInput(form);
    expect(command).not.toHaveProperty("invoiceNumber");
    expect(command.lineItems).toEqual([
      { description: "Existing work", qty: 2, unitPriceCents: 15000 },
    ]);
  });
  it("retains calendar dates when an editor west of UTC saves the same record", () => {
    vi.stubEnv("TZ", "America/New_York");
    const command = toCreateInvoiceInput(invoiceFormSchema.parse(invoiceFormValues(invoice)));
    expect(command.invoiceDate).toBe("2026-11-09");
    expect(command.dueDate).toBe("2026-11-30");
  });
});
