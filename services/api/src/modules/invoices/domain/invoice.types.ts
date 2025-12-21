export type InvoiceStatus = "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED";

export type InvoiceLine = {
  id: string;
  description: string;
  qty: number;
  unitPriceCents: number;
};

export type InvoicePayment = {
  id: string;
  amountCents: number;
  paidAt: Date;
  note?: string;
};

export type InvoiceTotals = {
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  paidCents: number;
  dueCents: number;
};
