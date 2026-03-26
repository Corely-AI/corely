import type {
  PosSaleLineItem,
  PosSalePayment,
  PosTransactionDetail,
  PosTransactionSummary,
} from "@corely/contracts";

export class PosSaleRecord {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly sessionId: string | null,
    public readonly registerId: string,
    public readonly registerName: string | null,
    public readonly receiptNumber: string,
    public readonly saleDate: Date,
    public readonly cashierEmployeePartyId: string,
    public readonly customerPartyId: string | null,
    public readonly subtotalCents: number,
    public readonly taxCents: number,
    public readonly totalCents: number,
    public readonly currency: string,
    public readonly status: "SYNCED",
    public readonly lineItems: PosSaleLineItem[],
    public readonly payments: PosSalePayment[],
    public readonly idempotencyKey: string,
    public readonly serverInvoiceId: string | null,
    public readonly serverPaymentId: string | null,
    public readonly syncedAt: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  toSummaryDto(): PosTransactionSummary {
    return {
      transactionId: this.id,
      workspaceId: this.workspaceId,
      sessionId: this.sessionId,
      registerId: this.registerId,
      registerName: this.registerName,
      receiptNumber: this.receiptNumber,
      saleDate: this.saleDate,
      cashierEmployeePartyId: this.cashierEmployeePartyId,
      customerPartyId: this.customerPartyId,
      subtotalCents: this.subtotalCents,
      taxCents: this.taxCents,
      totalCents: this.totalCents,
      currency: this.currency,
      status: this.status,
      payments: this.payments,
      syncedAt: this.syncedAt,
      createdAt: this.createdAt,
    };
  }

  toDetailDto(): PosTransactionDetail {
    return {
      ...this.toSummaryDto(),
      idempotencyKey: this.idempotencyKey,
      serverInvoiceId: this.serverInvoiceId,
      serverPaymentId: this.serverPaymentId,
      lineItems: this.lineItems,
      updatedAt: this.updatedAt,
    };
  }
}
