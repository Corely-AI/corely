export interface CoachingPaymentGatewayPort {
  createCheckoutSession(input: {
    tenantId: string;
    engagementId: string;
    title: string;
    description?: string | null;
    amountCents: number;
    currency: string;
    customerEmail?: string | null;
    successPath?: string;
    cancelPath?: string;
  }): Promise<{ sessionId: string; checkoutUrl: string }>;

  verifyWebhook(input: { rawBody: Buffer; signature?: string }): Promise<{
    id: string;
    type: string;
    checkoutSessionId?: string;
    paymentIntentId?: string;
    metadata: Record<string, string>;
  }>;
}

export const COACHING_PAYMENT_GATEWAY = "coaching-engagements/payment-gateway";
