export { renderEmail } from "./render.js";
export type { RenderEmailResult } from "./render.js";

// Re-export invoices module
export { InvoiceEmail, buildInvoiceEmailSubject } from "./invoices/index.js";
export type { InvoiceEmailProps } from "./invoices/index.js";
