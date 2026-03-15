import type {
  BillingEntitlements,
  BillingPlanCode,
  BillingProductKey,
  BillingSubscription,
  BillingTrial,
  BillingUpgradeContext,
  BillingUsageMetric,
  CreateBillingCheckoutSessionInput,
  CreateBillingCheckoutSessionOutput,
  CreateBillingPortalSessionInput,
  CreateBillingPortalSessionOutput,
  StartBillingTrialInput,
  StartBillingTrialOutput,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export const BILLING_ACCESS_PORT = Symbol("BILLING_ACCESS_PORT");

export type BillingUsageMetricCode = string;

export interface BillingAccessPort {
  getSubscription(tenantId: string, productKey?: BillingProductKey): Promise<BillingSubscription>;
  getEntitlements(tenantId: string, productKey?: BillingProductKey): Promise<BillingEntitlements>;
  getPlanFeatureValues(
    tenantId: string,
    productKey?: BillingProductKey
  ): Promise<Record<string, unknown>>;
  getAllPlanFeatureValues(tenantId: string): Promise<Record<string, unknown>>;
  getTrial(tenantId: string, productKey?: BillingProductKey): Promise<BillingTrial>;
  getUpgradeContext(
    tenantId: string,
    productKey?: BillingProductKey
  ): Promise<BillingUpgradeContext>;
  getUsage(tenantId: string, productKey?: BillingProductKey): Promise<BillingUsageMetric[]>;
  startTrial(
    tenantId: string,
    userId: string | null,
    input: StartBillingTrialInput
  ): Promise<StartBillingTrialOutput>;
  createCheckoutSession(
    tenantId: string,
    input: CreateBillingCheckoutSessionInput
  ): Promise<CreateBillingCheckoutSessionOutput>;
  createPortalSession(
    tenantId: string,
    input: CreateBillingPortalSessionInput
  ): Promise<CreateBillingPortalSessionOutput>;
  syncSubscription(tenantId: string, productKey?: BillingProductKey): Promise<BillingSubscription>;
  recordUsage(
    tenantId: string,
    productKey: BillingProductKey,
    metric: BillingUsageMetricCode,
    quantity: number,
    tx?: TransactionContext
  ): Promise<void>;
  setPlanForTenant(
    tenantId: string,
    productKey: BillingProductKey,
    planCode: BillingPlanCode,
    metadata?: {
      provider?: "stripe";
      customerRef?: string | null;
      subscriptionRef?: string | null;
      priceRef?: string | null;
      status?: BillingSubscription["status"];
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: Date | null;
      trialEndsAt?: Date | null;
      rawSnapshot?: unknown;
    },
    tx?: TransactionContext
  ): Promise<BillingSubscription>;
  processVerifiedWebhookEvent(input: {
    provider: "stripe";
    eventId: string;
    eventType: string;
    tenantId: string;
    customerRef: string | null;
    subscriptionRef: string | null;
    productKey?: BillingProductKey | null;
    rawPayload: unknown;
  }): Promise<void>;
  expireDueTrials(limit?: number): Promise<number>;
}
