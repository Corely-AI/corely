import type { InvoiceDraftGuidance } from "@corely/invoices-ui";

export const AcmeInvoiceGuidance: InvoiceDraftGuidance = () => (
  <p className="text-sm text-muted-foreground">Add a due date before finalizing this invoice.</p>
);
