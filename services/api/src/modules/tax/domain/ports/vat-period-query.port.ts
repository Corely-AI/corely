import { type VatAccountingMethod } from "@corely/contracts";

export interface VatPeriodInputs {
  salesNetCents: number;
  salesVatCents: number;
  purchaseNetCents: number;
  purchaseVatCents: number;
  // We can add more breakdown if needed
}

export abstract class VatPeriodQueryPort {
  /**
   * Get VAT inputs for a given period and accounting method
   */
  abstract getInputs(
    workspaceId: string,
    start: Date,
    end: Date,
    method: VatAccountingMethod
  ): Promise<VatPeriodInputs>;

  /**
   * Get detailed items (invoices/payments/expenses) for a period
   */
  abstract getDetails(
    workspaceId: string,
    start: Date,
    end: Date,
    method: VatAccountingMethod
  ): Promise<VatPeriodDetails>;
}

export interface VatPeriodDetails {
  sales: {
    sourceType: "INVOICE" | "PAYMENT";
    sourceId: string;
    displayNumber: string | null;
    customer: string | null;
    dateUsed: Date;
    netAmountCents: number;
    taxAmountCents: number;
    grossAmountCents: number;
    currency: string;
    status: string | null;
  }[];
  purchases: {
    sourceType: "EXPENSE";
    sourceId: string;
    displayNumber: string | null;
    customer: string | null;
    dateUsed: Date;
    netAmountCents: number;
    taxAmountCents: number;
    grossAmountCents: number;
    currency: string;
    status: string | null;
  }[];
}
