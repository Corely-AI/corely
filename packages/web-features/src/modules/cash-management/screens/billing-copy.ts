import { useTranslation } from "react-i18next";

type LocaleKey = "en" | "de" | "vi";

export type BillingCopy = {
  title: string;
  subtitle: string;
  currentPlan: string;
  planStatus: string;
  billingActions: string;
  usage: string;
  planCatalog: string;
  manageBilling: string;
  upgradePlan: string;
  currentPlanBadge: string;
  noLimit: string;
  billedMonthly: string;
  active: string;
  period: string;
  unavailable: string;
  loading: string;
  loadFailed: string;
  openPortalDescription: string;
  checkoutDescription: string;
  featureAccess: string;
  recommendedTitle: string;
  recommendedDescription: string;
  startTrial: string;
  trialTitle: string;
  noCardRequired: string;
  trialDescription: string;
  trialActive: (daysRemaining: number) => string;
  trialExpiring: (daysRemaining: number) => string;
  trialExpired: string;
  trialExpiredDescription: string;
  upgradeNow: string;
  afterTrialTitle: string;
  afterTrialDescription: string;
  trialStarted: string;
  trialStartFailed: string;
  usageLabels: {
    usedOf: (used: number, limit: string) => string;
    currentPeriod: string;
  };
  featureLabels: {
    maxLocations: string;
    maxEntriesPerMonth: string;
    maxReceiptsPerMonth: string;
    canExport: string;
    dailyClosing: string;
    aiAssistant: string;
    multilingualAiHelp: string;
    issueDetection: string;
    closingGuidance: string;
    teamAccess: string;
    consolidatedOverview: string;
  };
};

export const useBillingCopy = (): BillingCopy => {
  const { t } = useTranslation("billing");

  return {
    title: t("title"),
    subtitle: t("subtitle"),
    currentPlan: t("currentPlan"),
    planStatus: t("planStatus"),
    billingActions: t("billingActions"),
    usage: t("usage"),
    planCatalog: t("planCatalog"),
    manageBilling: t("manageBilling"),
    upgradePlan: t("upgradePlan"),
    currentPlanBadge: t("currentPlanBadge"),
    noLimit: t("noLimit"),
    billedMonthly: t("billedMonthly"),
    active: t("active"),
    period: t("period"),
    unavailable: t("unavailable"),
    loading: t("loading"),
    loadFailed: t("loadFailed"),
    openPortalDescription: t("openPortalDescription"),
    checkoutDescription: t("checkoutDescription"),
    featureAccess: t("featureAccess"),
    recommendedTitle: t("recommendedTitle"),
    recommendedDescription: t("recommendedDescription"),
    startTrial: t("startTrial"),
    trialTitle: t("trialTitle"),
    noCardRequired: t("noCardRequired"),
    trialDescription: t("trialDescription"),
    trialActive: (daysRemaining) => t("trialActive", { daysRemaining }),
    trialExpiring: (daysRemaining) => t("trialExpiring", { daysRemaining }),
    trialExpired: t("trialExpired"),
    trialExpiredDescription: t("trialExpiredDescription"),
    upgradeNow: t("upgradeNow"),
    afterTrialTitle: t("afterTrialTitle"),
    afterTrialDescription: t("afterTrialDescription"),
    trialStarted: t("trialStarted"),
    trialStartFailed: t("trialStartFailed"),
    usageLabels: {
      usedOf: (used, limit) => t("usageLabels.usedOf", { used, limit }),
      currentPeriod: t("usageLabels.currentPeriod"),
    },
    featureLabels: {
      maxLocations: t("featureLabels.maxLocations"),
      maxEntriesPerMonth: t("featureLabels.maxEntriesPerMonth"),
      maxReceiptsPerMonth: t("featureLabels.maxReceiptsPerMonth"),
      canExport: t("featureLabels.canExport"),
      dailyClosing: t("featureLabels.dailyClosing"),
      aiAssistant: t("featureLabels.aiAssistant"),
      multilingualAiHelp: t("featureLabels.multilingualAiHelp"),
      issueDetection: t("featureLabels.issueDetection"),
      closingGuidance: t("featureLabels.closingGuidance"),
      teamAccess: t("featureLabels.teamAccess"),
      consolidatedOverview: t("featureLabels.consolidatedOverview"),
    },
  };
};
