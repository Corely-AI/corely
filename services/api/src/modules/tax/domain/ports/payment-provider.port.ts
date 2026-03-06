/**
 * Payment attempt result from a payment provider.
 */
export interface PaymentIntent {
  /** Stable provider reference ID (used for status polling) */
  providerReference: string;
  /** Current status of the payment attempt */
  status: "pending" | "completed" | "failed";
  amountCents: number;
  currency: string;
  /** Provider-specific metadata (safe to store) */
  providerData?: Record<string, unknown>;
}

/**
 * PaymentProviderPort — Application port for initiating tax payments.
 *
 * Currently implemented by NoopPaymentProviderAdapter (manual proof upload only).
 * Future: stripe, sepa-credit, bank-transfer adapters.
 */
export abstract class PaymentProviderPort {
  /**
   * Initiate a payment for a tax filing.
   * Returns a PaymentIntent with a providerReference for status tracking.
   */
  abstract initiatePayment(opts: {
    filingId: string;
    amountCents: number;
    currency: string;
    tenantId: string;
    idempotencyKey?: string;
  }): Promise<PaymentIntent>;

  /**
   * Get the current status of a payment by provider reference.
   */
  abstract getPaymentStatus(providerReference: string): Promise<PaymentIntent>;
}

export const PAYMENT_PROVIDER_PORT = Symbol("PAYMENT_PROVIDER_PORT");
