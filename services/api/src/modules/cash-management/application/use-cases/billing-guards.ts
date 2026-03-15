import type { BillingEntitlements, BillingSubscription } from "@corely/contracts";
import { CashManagementBillingFeatureKeys, CashManagementProductKey } from "@corely/contracts";
import { ForbiddenError } from "@corely/kernel";
import type { BillingAccessPort } from "../../../billing";

export type CashBillingState = {
  subscription: BillingSubscription;
  entitlements: BillingEntitlements;
  periodStart: Date;
  periodEnd: Date;
};

const startOfUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const startOfNextUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

export const resolveBillingPeriod = (
  subscription: BillingSubscription
): { periodStart: Date; periodEnd: Date } => {
  const now = new Date();
  const periodStart = subscription.currentPeriodStart
    ? new Date(subscription.currentPeriodStart)
    : startOfUtcMonth(now);
  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : startOfNextUtcMonth(now);

  return { periodStart, periodEnd };
};

export const loadCashBillingState = async (
  billingAccess: BillingAccessPort,
  tenantId: string
): Promise<CashBillingState> => {
  const [subscription, entitlements] = await Promise.all([
    billingAccess.getSubscription(tenantId, CashManagementProductKey),
    billingAccess.getEntitlements(tenantId, CashManagementProductKey),
  ]);
  const { periodStart, periodEnd } = resolveBillingPeriod(subscription);

  return {
    subscription,
    entitlements,
    periodStart,
    periodEnd,
  };
};

export const assertBillingFeatureEnabled = (
  enabled: boolean,
  message: string,
  code: string,
  details?: unknown
): void => {
  if (!enabled) {
    throw new ForbiddenError(message, details, code);
  }
};

export const getCashBillingNumber = (
  entitlements: BillingEntitlements,
  key: keyof typeof CashManagementBillingFeatureKeys
): number | null => {
  const value = entitlements.featureValues[CashManagementBillingFeatureKeys[key]];
  return typeof value === "number" ? value : null;
};

export const getCashBillingBoolean = (
  entitlements: BillingEntitlements,
  key: keyof typeof CashManagementBillingFeatureKeys
): boolean => entitlements.featureValues[CashManagementBillingFeatureKeys[key]] === true;

export const assertBillingQuotaAvailable = (input: {
  used: number;
  limit: number | null;
  metric: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}): void => {
  if (input.limit === null) {
    return;
  }

  if (input.used >= input.limit) {
    throw new ForbiddenError(
      input.message,
      {
        metric: input.metric,
        used: input.used,
        limit: input.limit,
        ...input.details,
      },
      input.code
    );
  }
};
