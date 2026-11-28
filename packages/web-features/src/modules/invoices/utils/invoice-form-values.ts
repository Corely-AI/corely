import type { CreateInvoiceInput, InvoiceDto } from "@corely/contracts";
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

export function copyInvoiceDraftInput(
  invoice: InvoiceDto,
  isCorrection: boolean
): CreateInvoiceInput {
  return {
    customerPartyId: invoice.customerPartyId,
    currency: invoice.currency,
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    invoiceDate: isCorrection ? undefined : new Date().toISOString().slice(0, 10),
    dueDate: isCorrection ? undefined : (invoice.dueDate ?? undefined),
    lineItems: invoice.lineItems.map(({ description, qty, unitPriceCents }) => ({
      description,
      qty,
      unitPriceCents,
    })),
    paymentMethodId: invoice.paymentMethodId ?? undefined,
    ...(isCorrection
      ? { correctsInvoiceId: invoice.id, legalEntityId: invoice.legalEntityId ?? undefined }
      : {}),
  };
}
