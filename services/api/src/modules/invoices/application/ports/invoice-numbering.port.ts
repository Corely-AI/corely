export interface InvoiceNumberingPort {
  nextInvoiceNumber(tenantId: string): Promise<string>;
}

export const INVOICE_NUMBERING_PORT = "invoices/invoice-numbering";
