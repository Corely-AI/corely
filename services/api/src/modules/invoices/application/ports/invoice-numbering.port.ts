export interface InvoiceNumberingPort {
  nextInvoiceNumber(workspaceId: string, issuedAt: Date): Promise<string>;
}

export const INVOICE_NUMBERING_PORT = "invoices/invoice-numbering";
