import type {
  BillingPlanCode,
  BillingProductKey,
  BillingSubscriptionStatus,
} from "@corely/contracts";

export const BILLING_PROVIDER_PORT = Symbol("BILLING_PROVIDER_PORT");
export const BILLING_PROVIDER_TEST_HOOKS = Symbol("BILLING_PROVIDER_TEST_HOOKS");

export type BillingProviderTestOperation = "checkout" | "portal" | "fetch-subscription";

export interface BillingProviderSubscriptionSnapshot {
  provider: "stripe";
  productKey: BillingProductKey;
  customerRef: string;
  subscriptionRef: string;
  priceRef: string | null;
  planCode: BillingPlanCode;
  status: BillingSubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEndsAt: Date | null;
  rawSnapshot: unknown;
}

export interface BillingProviderWebhookEvent {
  provider: "stripe";
  eventId: string;
  eventType: string;
  customerRef: string | null;
  subscriptionRef: string | null;
  tenantId: string | null;
  productKey: BillingProductKey | null;
  rawPayload: unknown;
}

export interface BillingProviderPort {
  ensureCustomer(input: {
    tenantId: string;
    accountId: string;
    tenantName: string;
    email?: string | null;
    existingCustomerRef?: string | null;
  }): Promise<{ customerRef: string }>;
  createCheckoutSession(input: {
    tenantId: string;
    customerRef: string;
    productKey: BillingProductKey;
    planCode: BillingPlanCode;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; checkoutUrl: string }>;
  createPortalSession(input: {
    customerRef: string;
    returnUrl: string;
  }): Promise<{ portalUrl: string }>;
  fetchSubscriptionSnapshot(input: {
    productKey?: BillingProductKey | null;
    subscriptionRef?: string | null;
    customerRef?: string | null;
  }): Promise<BillingProviderSubscriptionSnapshot | null>;
  verifyAndParseWebhook(input: {
    rawBody: Buffer;
    signature: string | undefined;
  }): BillingProviderWebhookEvent;
}

export interface BillingProviderTestHooksPort {
  reset(): void;
  failNext(operation: BillingProviderTestOperation): void;
}
