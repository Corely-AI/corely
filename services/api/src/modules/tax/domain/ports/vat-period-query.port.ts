import { VatAccountingMethod } from "@corely/contracts";

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
    id: string;
    number: string | null;
    date: Date;
    customerName: string | null;
    netAmountCents: number;
    taxAmountCents: number;
    grossAmountCents: number;
  }[];
  purchases: {
    id: string;
    date: Date;
    merchantName: string | null;
    netAmountCents: number;
    taxAmountCents: number;
    grossAmountCents: number;
  }[];
}
