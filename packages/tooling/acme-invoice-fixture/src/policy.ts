import type { InvoiceFinalizationPolicy } from "@corely/invoices/extensions";

export const requireDueDate: InvoiceFinalizationPolicy = ({ dueDate }) =>
  dueDate ? undefined : "Add a due date before finalizing this invoice.";
