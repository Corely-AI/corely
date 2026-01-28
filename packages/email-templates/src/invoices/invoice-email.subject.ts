import type { InvoiceEmailProps } from "./invoice-email.types";

export function buildInvoiceEmailSubject(props: InvoiceEmailProps): string {
  return `Invoice ${props.invoiceNumber} from ${props.companyName}`;
}
