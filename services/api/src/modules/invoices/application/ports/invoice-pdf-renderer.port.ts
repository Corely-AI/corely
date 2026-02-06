export type InvoicePdfModel = {
  invoiceNumber: string;
  billFromName?: string;
  billFromAddress?: string;
  billToName: string;
  billToAddress?: string;
  issueDate: string;
  serviceDate?: string;
  dueDate?: string;
  currency: string;
  items: Array<{ description: string; qty: string; unitPrice: string; lineTotal: string }>;
  totals: { subtotal: string; vatRate?: string; vatAmount?: string; total: string };
  notes?: string;
  paymentSnapshot?: {
    type?: string;
    label?: string;
    accountHolderName?: string;
    iban?: string;
    bic?: string;
    bankName?: string;
    instructions?: string;
    payUrl?: string;
    referenceText?: string;
  };
};

export interface InvoicePdfRendererPort {
  renderInvoiceToPdf(args: {
    tenantId: string;
    invoiceId: string;
    model: InvoicePdfModel;
  }): Promise<Buffer>;
}

export const INVOICE_PDF_RENDERER_PORT = "invoices/invoice-pdf-renderer";
