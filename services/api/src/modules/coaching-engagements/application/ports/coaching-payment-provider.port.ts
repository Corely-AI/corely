export const COACHING_PAYMENT_PROVIDER_REGISTRY =
  "coaching-engagements/payment-provider-registry";
export const COACHING_PAYMENT_PROVIDER_TEST_HOOKS =
  "coaching-engagements/payment-provider-test-hooks";

export type CoachingPaymentProviderOperation = "checkout" | "refund";

export interface CoachingPaymentProviderWebhookEvent {
  provider: string;
  eventId: string;
  eventType: string;
  tenantId: string | null;
  engagementId: string | null;
  paymentId: string | null;
  checkoutSessionId: string | null;
  paymentRef: string | null;
  refundRef: string | null;
  status: "captured" | "failed" | "refunded" | null;
  failureCode: string | null;
  failureMessage: string | null;
  refundedAmountCents: number | null;
  rawPayload: unknown;
}

export interface CoachingPaymentProviderPort {
  readonly providerName: string;

  createCheckoutSession(input: {
    tenantId: string;
    engagementId: string;
    paymentId: string;
    title: string;
    description?: string | null;
    amountCents: number;
    currency: string;
    customerEmail?: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{
    checkoutSessionId: string;
    checkoutUrl: string;
  }>;

  refundPayment(input: {
    paymentRef: string;
    amountCents?: number;
    reason?: string;
  }): Promise<{
    refundRef: string;
    refundedAmountCents: number | null;
  }>;

  verifyAndParseWebhook(input: {
    rawBody: Buffer;
    signature?: string;
  }): Promise<CoachingPaymentProviderWebhookEvent>;
}

export interface CoachingPaymentProviderRegistryPort {
  get(providerName?: string): CoachingPaymentProviderPort;
  getByWebhook(providerName: string): CoachingPaymentProviderPort;
}

export interface CoachingPaymentProviderTestHooksPort {
  reset(): void;
  failNext(operation: CoachingPaymentProviderOperation): void;
}
