import type { InvoiceDto } from "@corely/contracts";
import type { CustomerOption } from "../components/invoice-form/CustomerSelection";

export function invoiceCustomerOptions(
  invoice: InvoiceDto | undefined,
  unknownName: string
): CustomerOption[] {
  const options: CustomerOption[] = [];
  if (!invoice) {
    return options;
  }
  if (invoice.customer) {
    options.push({
      id: invoice.customer.id,
      displayName: invoice.customer.displayName,
      billingAddress: invoice.customer.billingAddress,
      email: invoice.customer.email,
      vatId: invoice.customer.vatId,
    });
  }
  if (invoice.customerPartyId && invoice.customer?.id !== invoice.customerPartyId) {
    const line1 = invoice.billToAddressLine1 ?? undefined;
    const city = invoice.billToCity ?? undefined;
    const country = invoice.billToCountry ?? undefined;
    options.push({
      id: invoice.customerPartyId,
      displayName: invoice.billToName ?? unknownName,
      billingAddress: line1 || city || country ? { line1, city, country } : undefined,
    });
  }
  return options;
}
