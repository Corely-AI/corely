import type { BillingPlanCode } from "@corely/contracts";
import { CashManagementBillingFeatureKeys } from "@corely/contracts";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Globe2,
  LockKeyhole,
  Receipt,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

export const planOrder: BillingPlanCode[] = [
  "free",
  "starter-monthly",
  "pro-monthly",
  "multi-location-monthly",
];

export const featureIconMap = {
  [CashManagementBillingFeatureKeys.maxLocations]: Store,
  [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: CreditCard,
  [CashManagementBillingFeatureKeys.maxReceiptsPerMonth]: Receipt,
  [CashManagementBillingFeatureKeys.canExport]: CheckCircle2,
  [CashManagementBillingFeatureKeys.dailyClosing]: CheckCircle2,
  [CashManagementBillingFeatureKeys.aiAssistant]: Sparkles,
  [CashManagementBillingFeatureKeys.multilingualAiHelp]: Globe2,
  [CashManagementBillingFeatureKeys.issueDetection]: AlertTriangle,
  [CashManagementBillingFeatureKeys.closingGuidance]: LockKeyhole,
  [CashManagementBillingFeatureKeys.teamAccess]: Users,
  [CashManagementBillingFeatureKeys.consolidatedOverview]: Store,
} as const;

export const featureOrder = [
  {
    key: CashManagementBillingFeatureKeys.maxLocations,
    labelKey: "maxLocations",
  },
  {
    key: CashManagementBillingFeatureKeys.maxEntriesPerMonth,
    labelKey: "maxEntriesPerMonth",
  },
  {
    key: CashManagementBillingFeatureKeys.maxReceiptsPerMonth,
    labelKey: "maxReceiptsPerMonth",
  },
  {
    key: CashManagementBillingFeatureKeys.canExport,
    labelKey: "canExport",
  },
  {
    key: CashManagementBillingFeatureKeys.dailyClosing,
    labelKey: "dailyClosing",
  },
  {
    key: CashManagementBillingFeatureKeys.aiAssistant,
    labelKey: "aiAssistant",
  },
  {
    key: CashManagementBillingFeatureKeys.multilingualAiHelp,
    labelKey: "multilingualAiHelp",
  },
  {
    key: CashManagementBillingFeatureKeys.issueDetection,
    labelKey: "issueDetection",
  },
  {
    key: CashManagementBillingFeatureKeys.closingGuidance,
    labelKey: "closingGuidance",
  },
  {
    key: CashManagementBillingFeatureKeys.teamAccess,
    labelKey: "teamAccess",
  },
  {
    key: CashManagementBillingFeatureKeys.consolidatedOverview,
    labelKey: "consolidatedOverview",
  },
] as const;

export const formatPeriod = (start: string | null, end: string | null): string => {
  if (!start || !end) {
    return " - ";
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
};

export const isPaidPlan = (
  planCode: BillingPlanCode
): planCode is Exclude<BillingPlanCode, "free"> => planCode !== "free";

export const formatPrice = (priceCents: number, currency: string): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceCents / 100);

export const featureValueToText = (
  value: boolean | number | string | null | undefined,
  noLimitLabel: string
): string => {
  if (typeof value === "boolean") {
    return value ? "Included" : "Not included";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return noLimitLabel;
  }

  return String(value);
};
