export { renderEmail } from "./render";
export type { RenderEmailResult } from "./render";

// Re-export invoices module
export { InvoiceEmail, buildInvoiceEmailSubject } from "./invoices/index";
export type { InvoiceEmailProps } from "./invoices/index";
