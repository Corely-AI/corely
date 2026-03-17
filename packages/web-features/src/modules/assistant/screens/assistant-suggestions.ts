import { AlertCircle, FileText, Receipt, TrendingUp } from "lucide-react";
import type { TFunction } from "i18next";
import type { CapabilityGroup, Suggestion } from "@corely/web-shared/shared/components/Chat";

interface SuggestionOptions {
  activeModule: string;
  locale: string;
  t: TFunction;
}

export const getAssistantSuggestions = ({
  activeModule,
  locale,
  t,
}: SuggestionOptions): Suggestion[] => {
  if (activeModule === "cash-management") {
    const suggestions = t("cashDashboard.assistant.suggestions", { returnObjects: true });
    if (Array.isArray(suggestions)) {
      const icons = [Receipt, FileText, TrendingUp, AlertCircle];
      return suggestions.map((s: any, i: number) => ({
        ...s,
        icon: icons[i] || AlertCircle,
      }));
    }
  }

  return [
    {
      icon: Receipt,
      label: t("assistant.suggestions.extractReceipt.label"),
      value: t("assistant.suggestions.extractReceipt.value"),
    },
    {
      icon: FileText,
      label: t("assistant.suggestions.invoiceDraft.label"),
      value: t("assistant.suggestions.invoiceDraft.value"),
    },
    {
      icon: TrendingUp,
      label: t("assistant.suggestions.summarizeExpenses.label"),
      value: t("assistant.suggestions.summarizeExpenses.value"),
    },
    {
      icon: AlertCircle,
      label: t("assistant.suggestions.taxGuidance.label"),
      value: t("assistant.suggestions.taxGuidance.value"),
    },
  ];
};

export const getAssistantCapabilityGroups = ({
  activeModule,
  t,
}: Omit<SuggestionOptions, "locale">): CapabilityGroup[] => {
  if (activeModule !== "cash-management") {
    return [];
  }

  const groups = t("cashDashboard.assistant.capabilityGroups", { returnObjects: true });
  return Array.isArray(groups) ? (groups as CapabilityGroup[]) : [];
};
