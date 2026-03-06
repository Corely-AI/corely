import { Injectable } from "@nestjs/common";
import { PaymentProviderPort, type PaymentIntent } from "../../domain/ports/payment-provider.port";

/**
 * Noop Payment Provider Adapter
 *
 * Manual proof-upload only flow: does NOT initiate any real payment.
 * Returns a static "pending" intent that the user must manually complete
 * by uploading a payment proof document.
 *
 * Replace this with a real provider adapter (e.g., SEPA, Stripe) in future.
 */
@Injectable()
export class NoopPaymentProviderAdapter extends PaymentProviderPort {
  async initiatePayment(opts: {
    filingId: string;
    amountCents: number;
    currency: string;
    tenantId: string;
    idempotencyKey?: string;
  }): Promise<PaymentIntent> {
    // Manual flow: return a deterministic pending intent based on the filing ID
    return {
      providerReference: `manual:${opts.filingId}`,
      status: "pending",
      amountCents: opts.amountCents,
      currency: opts.currency,
      providerData: {
        type: "manual",
        message: "Please upload the payment proof document to complete the payment.",
      },
    };
  }

  async getPaymentStatus(providerReference: string): Promise<PaymentIntent> {
    // Manual payments stay pending until user uploads proof
    const [, filingId] = providerReference.split(":");
    return {
      providerReference,
      status: "pending",
      amountCents: 0,
      currency: "EUR",
      providerData: { type: "manual", filingId },
    };
  }
}
