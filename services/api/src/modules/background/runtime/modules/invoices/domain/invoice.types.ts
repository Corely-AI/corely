export type InvoiceStatus = "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED";

export type PdfStatus = "NONE" | "GENERATING" | "READY" | "FAILED";

export type InvoiceSourceType = "manual" | "order" | "quote" | "deal";

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

export type PaymentDetailsSnapshot = {
  type?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  iban?: string;
  bic?: string;
  label?: string;
  instructions?: string;
  referenceTemplate?: string;
  payUrl?: string;
};

export type IssuerSnapshot = {
  name: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  taxId?: string;
  vatId?: string;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
};

import type { TaxBreakdownDto } from "@corely/contracts";

// ... existing types ...

export type TaxSnapshot = TaxBreakdownDto & {
  appliedAt?: string | Date;
};
