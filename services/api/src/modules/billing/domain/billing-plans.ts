import type {
  BillingEntitlements,
  BillingFeatureValues,
  BillingPlanCode,
  BillingPlanDefinition,
  BillingProductKey,
} from "@corely/contracts";
import {
  CashManagementBillingFeatureKeys,
  CashManagementBillingMetricKeys,
  CashManagementProductKey,
} from "@corely/contracts";

export interface BillingUsageMetricDefinition {
  key: string;
  label: string;
  limitFeatureKey: string | null;
}

export interface BillingProductDefinition {
  productKey: BillingProductKey;
  displayName: string;
  defaultPlanCode: BillingPlanCode;
  plans: Record<string, BillingPlanDefinition>;
  usageMetrics: BillingUsageMetricDefinition[];
  trial?: {
    planCode: BillingPlanCode;
    durationDays: number;
  };
  stripePriceEnvKeys?: Partial<Record<string, string>>;
}

const entitlements = (
  productKey: BillingProductKey,
  planCode: BillingPlanCode,
  featureValues: BillingFeatureValues
): BillingEntitlements => ({
  productKey,
  planCode,
  featureValues,
});

const cashManagementPlans: Record<string, BillingPlanDefinition> = {
  free: {
    productKey: CashManagementProductKey,
    code: "free",
    name: "Free",
    priceCents: 0,
    currency: "EUR",
    interval: "month",
    summary: "For one salon location getting started with basic daily cash control.",
    highlights: [
      "1 location",
      "30 entries per month",
      "10 receipts per month",
      "No export",
      "No AI assistant",
    ],
    upgradeRank: 0,
    entitlements: entitlements(CashManagementProductKey, "free", {
      [CashManagementBillingFeatureKeys.maxLocations]: 1,
      [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: 30,
      [CashManagementBillingFeatureKeys.maxReceiptsPerMonth]: 10,
      [CashManagementBillingFeatureKeys.canExport]: false,
      [CashManagementBillingFeatureKeys.dailyClosing]: false,
      [CashManagementBillingFeatureKeys.aiAssistant]: false,
      [CashManagementBillingFeatureKeys.multilingualAiHelp]: false,
      [CashManagementBillingFeatureKeys.issueDetection]: false,
      [CashManagementBillingFeatureKeys.closingGuidance]: false,
      [CashManagementBillingFeatureKeys.teamAccess]: false,
      [CashManagementBillingFeatureKeys.consolidatedOverview]: false,
    }),
  },
  "starter-monthly": {
    productKey: CashManagementProductKey,
    code: "starter-monthly",
    name: "Starter",
    priceCents: 1200,
    currency: "EUR",
    interval: "month",
    summary: "Unlimited daily cash book operations for one location.",
    highlights: [
      "1 location",
      "Unlimited entries",
      "Unlimited receipts",
      "Daily closing",
      "Monthly export",
    ],
    upgradeRank: 1,
    entitlements: entitlements(CashManagementProductKey, "starter-monthly", {
      [CashManagementBillingFeatureKeys.maxLocations]: 1,
      [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: null,
      [CashManagementBillingFeatureKeys.maxReceiptsPerMonth]: null,
      [CashManagementBillingFeatureKeys.canExport]: true,
      [CashManagementBillingFeatureKeys.dailyClosing]: true,
      [CashManagementBillingFeatureKeys.aiAssistant]: false,
      [CashManagementBillingFeatureKeys.multilingualAiHelp]: false,
      [CashManagementBillingFeatureKeys.issueDetection]: false,
      [CashManagementBillingFeatureKeys.closingGuidance]: false,
      [CashManagementBillingFeatureKeys.teamAccess]: false,
      [CashManagementBillingFeatureKeys.consolidatedOverview]: false,
    }),
  },
  "pro-monthly": {
    productKey: CashManagementProductKey,
    code: "pro-monthly",
    name: "Pro",
    priceCents: 1900,
    currency: "EUR",
    interval: "month",
    summary: "Adds AI help and advanced issue detection for one location.",
    highlights: [
      "Everything in Starter",
      "AI assistant",
      "Multilingual AI help",
      "Issue detection",
      "Closing guidance",
    ],
    upgradeRank: 2,
    entitlements: entitlements(CashManagementProductKey, "pro-monthly", {
      [CashManagementBillingFeatureKeys.maxLocations]: 1,
      [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: null,
      [CashManagementBillingFeatureKeys.maxReceiptsPerMonth]: null,
      [CashManagementBillingFeatureKeys.canExport]: true,
      [CashManagementBillingFeatureKeys.dailyClosing]: true,
      [CashManagementBillingFeatureKeys.aiAssistant]: true,
      [CashManagementBillingFeatureKeys.multilingualAiHelp]: true,
      [CashManagementBillingFeatureKeys.issueDetection]: true,
      [CashManagementBillingFeatureKeys.closingGuidance]: true,
      [CashManagementBillingFeatureKeys.teamAccess]: false,
      [CashManagementBillingFeatureKeys.consolidatedOverview]: false,
    }),
  },
  "multi-location-monthly": {
    productKey: CashManagementProductKey,
    code: "multi-location-monthly",
    name: "Multi-location",
    priceCents: 3900,
    currency: "EUR",
    interval: "month",
    summary: "For salon groups managing multiple locations and teams.",
    highlights: ["Everything in Pro", "Multiple locations", "Team access", "Consolidated overview"],
    upgradeRank: 3,
    entitlements: entitlements(CashManagementProductKey, "multi-location-monthly", {
      [CashManagementBillingFeatureKeys.maxLocations]: null,
      [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: null,
      [CashManagementBillingFeatureKeys.maxReceiptsPerMonth]: null,
      [CashManagementBillingFeatureKeys.canExport]: true,
      [CashManagementBillingFeatureKeys.dailyClosing]: true,
      [CashManagementBillingFeatureKeys.aiAssistant]: true,
      [CashManagementBillingFeatureKeys.multilingualAiHelp]: true,
      [CashManagementBillingFeatureKeys.issueDetection]: true,
      [CashManagementBillingFeatureKeys.closingGuidance]: true,
      [CashManagementBillingFeatureKeys.teamAccess]: true,
      [CashManagementBillingFeatureKeys.consolidatedOverview]: true,
    }),
  },
};

const billingProducts: BillingProductDefinition[] = [
  {
    productKey: CashManagementProductKey,
    displayName: "Cash Management",
    defaultPlanCode: "free",
    plans: cashManagementPlans,
    usageMetrics: [
      {
        key: CashManagementBillingMetricKeys.entries,
        label: "Cash entries this period",
        limitFeatureKey: CashManagementBillingFeatureKeys.maxEntriesPerMonth,
      },
      {
        key: CashManagementBillingMetricKeys.receipts,
        label: "Receipts this period",
        limitFeatureKey: CashManagementBillingFeatureKeys.maxReceiptsPerMonth,
      },
    ],
    trial: {
      planCode: "multi-location-monthly",
      durationDays: 30,
    },
    stripePriceEnvKeys: {
      "starter-monthly": "STRIPE_BILLING_PRICE_STARTER_MONTHLY",
      "pro-monthly": "STRIPE_BILLING_PRICE_PRO_MONTHLY",
      "multi-location-monthly": "STRIPE_BILLING_PRICE_MULTI_LOCATION_MONTHLY",
    },
  },
];

const billingProductCatalog = new Map(
  billingProducts.map((definition) => [definition.productKey, definition] as const)
);

export const defaultBillingProductKey: BillingProductKey = CashManagementProductKey;
export const defaultBillingPlanCode: BillingPlanCode =
  billingProductCatalog.get(defaultBillingProductKey)?.defaultPlanCode ?? "free";

export const getBillingProductDefinition = (
  productKey: BillingProductKey = defaultBillingProductKey
): BillingProductDefinition => {
  const definition = billingProductCatalog.get(productKey);
  if (!definition) {
    throw new Error(`Unknown billing product ${productKey}`);
  }

  return definition;
};

export const listBillingProducts = (): BillingProductDefinition[] => [
  ...billingProductCatalog.values(),
];

export const getBillingPlanDefinition = (
  productKey: BillingProductKey,
  planCode: BillingPlanCode
): BillingPlanDefinition => {
  const product = getBillingProductDefinition(productKey);
  const plan = product.plans[planCode];
  if (!plan) {
    throw new Error(`Unknown billing plan ${planCode} for product ${productKey}`);
  }

  return plan;
};

export const listBillingPlans = (
  productKey: BillingProductKey = defaultBillingProductKey
): BillingPlanDefinition[] =>
  Object.values(getBillingProductDefinition(productKey).plans).sort(
    (left, right) => left.upgradeRank - right.upgradeRank
  );

export const resolveBillingEntitlements = (
  productKey: BillingProductKey = defaultBillingProductKey,
  planCode: BillingPlanCode = getBillingProductDefinition(productKey).defaultPlanCode
): BillingEntitlements => getBillingPlanDefinition(productKey, planCode).entitlements;

export const getPlanFeatureValues = (
  productKey: BillingProductKey = defaultBillingProductKey,
  planCode: BillingPlanCode = getBillingProductDefinition(productKey).defaultPlanCode
): BillingFeatureValues => resolveBillingEntitlements(productKey, planCode).featureValues;

export const getBillingUsageMetricDefinitions = (
  productKey: BillingProductKey = defaultBillingProductKey
): BillingUsageMetricDefinition[] => getBillingProductDefinition(productKey).usageMetrics;

export const getStripePriceEnvKey = (
  productKey: BillingProductKey,
  planCode: BillingPlanCode
): string | null => getBillingProductDefinition(productKey).stripePriceEnvKeys?.[planCode] ?? null;
