export interface InvoicePdfModelPort {
  getInvoicePdfModel(
    tenantId: string,
    invoiceId: string
  ): Promise<{
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
    issuerInfo?: {
      taxId?: string;
      vatId?: string;
      phone?: string;
      email?: string;
      website?: string;
    };
    paymentSnapshot?: {
      type?: string;
      bankName?: string;
      accountHolderName?: string;
      iban?: string;
      bic?: string;
      label?: string;
      instructions?: string;
      referenceText?: string;
      payUrl?: string;
    };
  } | null>;
}

export const INVOICE_PDF_MODEL_PORT = "invoices/invoice-pdf-model";
