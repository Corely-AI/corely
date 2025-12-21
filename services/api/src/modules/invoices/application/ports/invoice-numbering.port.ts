export interface InvoiceNumberingPort {
  nextInvoiceNumber(tenantId: string): Promise<string>;
}

export const INVOICE_NUMBERING_PORT = Symbol("INVOICE_NUMBERING_PORT");
