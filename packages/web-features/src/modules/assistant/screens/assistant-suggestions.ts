import { AlertCircle, FileText, Receipt, TrendingUp } from "lucide-react";
import type { TFunction } from "i18next";
import type { Suggestion } from "@corely/web-shared/shared/components/Chat";

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
    if (locale.startsWith("de")) {
      return [
        {
          icon: Receipt,
          label: "Fehlende Belege finden",
          value: "Welche Bareintraege von heute brauchen noch einen Beleg?",
        },
        {
          icon: FileText,
          label: "Kassenstatus heute",
          value: "Zeig mir den heutigen Kassenstatus und ob ich abschliessen kann.",
        },
        {
          icon: TrendingUp,
          label: "Tag abschliessen",
          value: "Was blockiert den heutigen Tagesabschluss?",
        },
        {
          icon: AlertCircle,
          label: "Begriff erklaeren",
          value: "Was bedeutet Privateinlage im Kassenbuch?",
        },
      ];
    }

    if (locale.startsWith("vi")) {
      return [
        {
          icon: Receipt,
          label: "Tim hoa don thieu",
          value: "Hom nay giao dich nao con thieu hoa don?",
        },
        {
          icon: FileText,
          label: "Trang thai quy hom nay",
          value: "Cho toi biet tinh trang quy hom nay va co dong ngay duoc chua.",
        },
        {
          icon: TrendingUp,
          label: "Dong ngay",
          value: "Dieu gi dang chan viec dong so quy hom nay?",
        },
        {
          icon: AlertCircle,
          label: "Giai thich thuat ngu",
          value: "Privateinlage co nghia la gi?",
        },
      ];
    }

    return [
      {
        icon: Receipt,
        label: "Find missing receipts",
        value: "Which cash entries from today still need receipts?",
      },
      {
        icon: FileText,
        label: "Today's cash status",
        value: "Show me today's cash status and whether the day is ready to close.",
      },
      {
        icon: TrendingUp,
        label: "Close the day",
        value: "What is blocking today's cash close?",
      },
      {
        icon: AlertCircle,
        label: "Explain a term",
        value: "What does Privateinlage mean in the cash book?",
      },
    ];
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
