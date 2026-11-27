import type { InvoiceEmailProps } from "./invoice-email.types";
import { formatInvoiceEmailTitle, getInvoiceEmailCopy } from "./invoice-email-copy";

export function buildInvoiceEmailSubject(props: InvoiceEmailProps): string {
  return formatInvoiceEmailTitle(getInvoiceEmailCopy(props.locale).copy.preview, props);
}
