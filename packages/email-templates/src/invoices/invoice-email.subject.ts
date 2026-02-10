import type { InvoiceEmailProps } from "./invoice-email.types";

export function buildInvoiceEmailSubject(props: InvoiceEmailProps): string {
  return `${props.companyName} sent you an invoice ${props.invoiceNumber}`;
}
