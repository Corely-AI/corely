import { AlertCircle, FileText, Receipt, Sparkles, TrendingUp } from "lucide-react";
import { Chat, type Suggestion } from "@/shared/components/Chat";
import { useTranslation } from "react-i18next";

export default function AssistantPage() {
  const { t, i18n } = useTranslation();

  const suggestions: Suggestion[] = [
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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen" data-testid="assistant-chat">
      <header className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{t("assistant.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("assistant.subtitle")}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6" data-testid="assistant-messages">
          <Chat
            activeModule="assistant"
            locale={i18n.language}
            placeholder={t("assistant.placeholder")}
            suggestions={suggestions}
            emptyStateTitle={t("assistant.emptyStateTitle")}
            emptyStateDescription={t("assistant.emptyStateDescription")}
          />
        </div>
      </main>
    </div>
  );
}
