import type {
  BillingPlanCode,
  BillingProductKey,
  BillingSubscriptionStatus,
  BillingTrialStatus,
  BillingUsageMetricKey,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export const BILLING_ACCOUNT_REPO = Symbol("BILLING_ACCOUNT_REPO");
export const BILLING_SUBSCRIPTION_REPO = Symbol("BILLING_SUBSCRIPTION_REPO");
export const BILLING_TRIAL_REPO = Symbol("BILLING_TRIAL_REPO");
export const BILLING_USAGE_REPO = Symbol("BILLING_USAGE_REPO");
export const BILLING_PROVIDER_EVENT_REPO = Symbol("BILLING_PROVIDER_EVENT_REPO");

export interface BillingAccountRecord {
  id: string;
  tenantId: string;
  provider: "stripe" | null;
  providerCustomerRef: string | null;
  billingCurrency: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingSubscriptionRecord {
  id: string;
  tenantId: string;
  productKey: BillingProductKey;
  accountId: string;
  planCode: BillingPlanCode;
  provider: "stripe" | null;
  providerSubscriptionRef: string | null;
  providerPriceRef: string | null;
  status: BillingSubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEndsAt: Date | null;
  rawSnapshotJson: unknown;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingTrialRecord {
  id: string;
  tenantId: string;
  productKey: BillingProductKey;
  accountId: string;
  planCode: BillingPlanCode;
  status: Exclude<BillingTrialStatus, "not_started">;
  startedAt: Date;
  endsAt: Date;
  expiredAt: Date | null;
  supersededAt: Date | null;
  activatedByUserId: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingUsageCounterRecord {
  id: string;
  tenantId: string;
  productKey: BillingProductKey;
  metricKey: BillingUsageMetricKey;
  periodStart: Date;
  periodEnd: Date;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingProviderEventRecord {
  id: string;
  tenantId: string;
  accountId: string | null;
  provider: "stripe";
  externalEventId: string;
  eventType: string;
  payloadJson: unknown;
  status: "received" | "processed" | "failed" | "ignored";
  errorMessage: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingTenantProfile {
  tenantId: string;
  name: string;
  primaryEmail: string | null;
  workspaceCount: number;
}

export interface BillingAccountRepoPort {
  findAccountByTenantId(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<BillingAccountRecord | null>;
  upsertAccount(
    input: {
      tenantId: string;
      provider: "stripe" | null;
      providerCustomerRef?: string | null;
      billingCurrency?: string;
      email?: string | null;
    },
    tx?: TransactionContext
  ): Promise<BillingAccountRecord>;
  getTenantProfile(tenantId: string): Promise<BillingTenantProfile>;
}

export interface BillingSubscriptionRepoPort {
  findSubscriptionByTenantId(
    tenantId: string,
    productKey: BillingProductKey,
    tx?: TransactionContext
  ): Promise<BillingSubscriptionRecord | null>;
  listSubscriptionsByTenantId(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<BillingSubscriptionRecord[]>;
  findByProviderSubscriptionRef(
    provider: "stripe",
    subscriptionRef: string,
    tx?: TransactionContext
  ): Promise<BillingSubscriptionRecord | null>;
  upsertSubscription(
    input: {
      tenantId: string;
      productKey: BillingProductKey;
      accountId: string;
      planCode: BillingPlanCode;
      provider: "stripe" | null;
      providerSubscriptionRef?: string | null;
      providerPriceRef?: string | null;
      status: BillingSubscriptionStatus;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: Date | null;
      trialEndsAt?: Date | null;
      rawSnapshotJson?: unknown;
      lastSyncedAt?: Date | null;
    },
    tx?: TransactionContext
  ): Promise<BillingSubscriptionRecord>;
}

export interface BillingTrialRepoPort {
  findTrialByTenantId(
    tenantId: string,
    productKey: BillingProductKey,
    tx?: TransactionContext
  ): Promise<BillingTrialRecord | null>;
  listTrialsEndingBefore(endsBefore: Date, tx?: TransactionContext): Promise<BillingTrialRecord[]>;
  upsertTrial(
    input: {
      tenantId: string;
      productKey: BillingProductKey;
      accountId: string;
      planCode: BillingPlanCode;
      status: Exclude<BillingTrialStatus, "not_started">;
      startedAt: Date;
      endsAt: Date;
      expiredAt?: Date | null;
      supersededAt?: Date | null;
      activatedByUserId?: string | null;
      source?: string | null;
    },
    tx?: TransactionContext
  ): Promise<BillingTrialRecord>;
}

export interface BillingUsageRepoPort {
  listUsage(
    tenantId: string,
    productKey: BillingProductKey,
    tx?: TransactionContext
  ): Promise<BillingUsageCounterRecord[]>;
  incrementUsage(
    input: {
      tenantId: string;
      productKey: BillingProductKey;
      metricKey: BillingUsageMetricKey;
      periodStart: Date;
      periodEnd: Date;
      quantity: number;
    },
    tx?: TransactionContext
  ): Promise<void>;
}

export interface BillingProviderEventRepoPort {
  findByExternalEventId(
    provider: "stripe",
    externalEventId: string,
    tx?: TransactionContext
  ): Promise<BillingProviderEventRecord | null>;
  createEvent(
    input: {
      tenantId: string;
      accountId?: string | null;
      provider: "stripe";
      externalEventId: string;
      eventType: string;
      payloadJson: unknown;
    },
    tx?: TransactionContext
  ): Promise<BillingProviderEventRecord>;
  markProcessed(eventId: string, tx?: TransactionContext): Promise<void>;
  markFailed(eventId: string, errorMessage: string, tx?: TransactionContext): Promise<void>;
  markIgnored(eventId: string, tx?: TransactionContext): Promise<void>;
}
