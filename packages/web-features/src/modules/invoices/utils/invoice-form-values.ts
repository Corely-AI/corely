import type { InvoiceDto } from "@corely/contracts";
import { parseISO } from "date-fns";
import { getDefaultInvoiceFormValues, type InvoiceFormData } from "../schemas/invoice-form.schema";

/** Keep the existing editor projection shared by every Invoice surface. */
export function invoiceFormValues(invoice: InvoiceDto): Partial<InvoiceFormData> {
  const defaults = getDefaultInvoiceFormValues();
  return {
    ...defaults,
    invoiceNumber: invoice.number ?? defaults.invoiceNumber,
    customerPartyId: invoice.customerPartyId,
    currency: invoice.currency,
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    invoiceDate: invoice.invoiceDate ? parseISO(invoice.invoiceDate) : new Date(),
    dueDate: invoice.dueDate ? parseISO(invoice.dueDate) : undefined,
    vatRate: 19,
    lineItems: invoice.lineItems.length
      ? invoice.lineItems.map((line) => ({
          description: line.description,
          qty: line.qty,
          unitPriceCents: line.unitPriceCents,
          unit: "h",
        }))
      : (defaults.lineItems ?? []),
    paymentMethodId: invoice.paymentMethodId ?? undefined,
  };
}
