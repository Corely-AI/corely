export type InvoicePdfModel = {
  invoiceNumber: string;
  billToName: string;
  billToAddress?: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  items: Array<{ description: string; qty: string; unitPrice: string; lineTotal: string }>;
  totals: { subtotal: string; total: string };
  notes?: string;
};

export interface InvoicePdfRendererPort {
  renderInvoiceToPdf(args: {
    tenantId: string;
    invoiceId: string;
    model: InvoicePdfModel;
  }): Promise<Buffer>;
}

export const INVOICE_PDF_RENDERER_PORT = Symbol("INVOICE_PDF_RENDERER_PORT");
