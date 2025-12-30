import type { BillPayment } from "../../domain/purchasing.types";

export interface BillPaymentRepositoryPort {
  findById(tenantId: string, paymentId: string): Promise<BillPayment | null>;
  listByBill(tenantId: string, vendorBillId: string): Promise<BillPayment[]>;
  create(tenantId: string, payment: BillPayment): Promise<void>;
}

export const BILL_PAYMENT_REPO = "purchasing/bill-payment-repository";
