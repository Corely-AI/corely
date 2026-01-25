import { type PaymentDetailsSnapshot } from "../../domain/invoice.types";

export interface PaymentMethodQueryPort {
  getPaymentMethodSnapshot(
    tenantId: string,
    paymentMethodId?: string
  ): Promise<PaymentDetailsSnapshot | null>;
}

export const PAYMENT_METHOD_QUERY_PORT = "invoices/payment-method-query";
