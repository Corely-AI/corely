import { type PaymentMethodQueryPort } from "../../application/ports/payment-method-query.port";
import { type PaymentDetailsSnapshot } from "../../domain/invoice.types";

export class FakePaymentMethodQuery implements PaymentMethodQueryPort {
  methods: Record<string, PaymentDetailsSnapshot> = {};

  setMethod(tenantId: string, methodId: string, snapshot: PaymentDetailsSnapshot) {
    this.methods[`${tenantId}:${methodId}`] = snapshot;
  }

  setDefaultMethod(tenantId: string, snapshot: PaymentDetailsSnapshot) {
    this.methods[`${tenantId}:default`] = snapshot;
  }

  async getPaymentMethodSnapshot(
    tenantId: string,
    paymentMethodId?: string
  ): Promise<PaymentDetailsSnapshot | null> {
    const key = paymentMethodId ? `${tenantId}:${paymentMethodId}` : `${tenantId}:default`;
    return this.methods[key] ?? null;
  }
}
