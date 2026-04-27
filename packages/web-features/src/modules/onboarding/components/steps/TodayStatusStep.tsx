import React from "react";
import { Button, Card, CardContent } from "@corely/ui";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlignVerticalDistributeCenter,
  Calculator,
  Sparkles,
  ReceiptText,
} from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { cn } from "@corely/web-shared/shared/lib/utils";

export const TodayStatusStep = ({
  config,
  locale,
  progress,
  onAdvance,
  isSaving,
}: StepComponentProps) => {
  const { t } = useTranslation();
  const analytics = useOnboardingAnalytics();

  const obStepId = "opening-balance";
  const obCents =
    typeof progress?.steps?.[obStepId]?.answers?.openingBalanceCents === "number"
      ? (progress.steps[obStepId].answers!.openingBalanceCents as number)
      : 15000;

  const incomeCents = 2550;
  const expenseCents = 820;
  const currentCents = obCents + incomeCents - expenseCents;

  const currencySymbol = locale === "vi" ? "₫" : "€";
  const formatValue = (cents: number) => {
    const val = (cents / 100).toFixed(2);
    return locale === "vi" ? `${val}${currencySymbol}` : `${currencySymbol}${val}`;
  };

  const handleNext = () => {
    analytics.track("onboarding.today_status_viewed", { currentBalance: currentCents });
    onAdvance();
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];

  const receiptStepStatus = progress?.steps?.["first-receipt"]?.status;
  const workflowSource = progress?.workflowSource;

  const getWorkflowCopy = () => {
    switch (workflowSource) {
      case "paper":
        return t("onboarding.status.workflowPaper");
      case "excel":
        return t("onboarding.status.workflowExcel");
      case "pos":
        return t("onboarding.status.workflowPos");
      case "software":
        return t("onboarding.status.workflowSoftware");
      default:
        return null;
    }
  };
  const workflowCopy = getWorkflowCopy();

  return (
    <div
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-today-status"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <AlignVerticalDistributeCenter className="h-10 w-10" />
      </div>

      <div className="max-w-2xl space-y-4 mb-16">
        <h1
          className="text-6xl font-black tracking-tight sm:text-7xl bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-[0.95]"
          data-testid="onboarding-step-title"
        >
          {title}
        </h1>
        <p
          className="text-2xl text-muted-foreground/80 leading-relaxed max-w-xl font-medium"
          data-testid="onboarding-step-description"
        >
          {desc}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16 max-w-3xl">
        <Card className="col-span-1 sm:col-span-2 overflow-hidden border-white/5 bg-gradient-to-br from-accent/15 to-accent/[0.02] shadow-2xl shadow-accent/10 rounded-[3rem] group">
          <CardContent className="p-12">
            <div className="flex justify-between items-start mb-6">
              <p className="text-sm font-black text-accent uppercase tracking-[0.2em] opacity-80 decoration-accent decoration-2 underline-offset-8 decoration-dotted underline">
                {t("onboarding.status.expectedLabel")}
              </p>
              <Calculator className="h-8 w-8 text-accent opacity-20 group-hover:opacity-40 group-hover:rotate-12 transition-all duration-500" />
            </div>
            <div
              className="text-7xl font-black text-foreground tracking-tight leading-none"
              data-testid="onboarding-today-expected"
            >
              {formatValue(currentCents)}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-white/5 bg-white/[0.02] rounded-[2.5rem] hover:bg-white/[0.04] transition-all duration-500 group shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:glow-emerald transition-all">
                <TrendingUp className="h-6 w-6" />
              </div>
              <p className="text-xs font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                {t("onboarding.status.incomeLabel")}
              </p>
            </div>
            <div
              className="text-4xl font-black text-emerald-400 tracking-tight"
              data-testid="onboarding-today-income"
            >
              +{formatValue(incomeCents)}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-white/5 bg-white/[0.02] rounded-[2.5rem] hover:bg-white/[0.04] transition-all duration-500 group shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 group-hover:glow-orange transition-all">
                <TrendingDown className="h-6 w-6" />
              </div>
              <p className="text-xs font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                {t("onboarding.status.expenseLabel")}
              </p>
            </div>
            <div
              className="text-4xl font-black text-orange-400 tracking-tight"
              data-testid="onboarding-today-expense"
            >
              -{formatValue(expenseCents)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 max-w-3xl mb-16">
        {receiptStepStatus === "skipped" && (
          <div
            className="rounded-[2.5rem] border border-orange-500/20 bg-orange-500/5 p-8 text-lg text-orange-200/70 leading-relaxed animate-in slide-in-from-left-8 duration-700 relative overflow-hidden group shadow-xl"
            data-testid="onboarding-receipt-reminder"
          >
            <div className="flex items-start gap-6 relative z-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <span className="font-black text-orange-400 uppercase tracking-widest text-sm block">
                  {t("onboarding.status.receiptReminder")}
                </span>
                <p className="font-medium italic">{t("onboarding.status.receiptMissing")}</p>
              </div>
            </div>
          </div>
        )}

        {workflowCopy && (
          <div
            className="rounded-[2.5rem] border border-accent/20 bg-accent/5 p-8 text-lg text-foreground/80 leading-relaxed animate-in slide-in-from-left-8 duration-1000 relative overflow-hidden group shadow-xl"
            data-testid="onboarding-workflow-personalized"
          >
            <div className="flex items-start gap-6 relative z-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <span className="font-black text-accent uppercase tracking-widest text-sm block">
                  {t("onboarding.workflow.insightTitle")}
                </span>
                <p className="font-medium italic">{workflowCopy}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-10 bg-white/[0.01] rounded-[2.5rem] border border-white/5 flex gap-8 items-center shadow-xl">
          <div className="text-4xl h-16 w-16 shrink-0 flex items-center justify-center rounded-[1.5rem] bg-white/5 shadow-inner">
            💡
          </div>
          <div className="space-y-2">
            <strong className="text-xl font-black text-foreground block">
              {t("onboarding.status.tipTitle")}
            </strong>{" "}
            <p className="text-lg text-muted-foreground/60 font-medium leading-relaxed">
              {t("onboarding.status.tipDesc")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          size="lg"
          className="h-20 px-16 rounded-[2rem] text-xl font-black bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] transition-all duration-500 group shadow-2xl shadow-accent/20 w-full sm:w-auto"
          onClick={handleNext}
          disabled={isSaving}
          data-testid="onboarding-today-next"
        >
          <span className="flex items-center gap-4">
            {t("onboarding.status.cta")}
            <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-2" />
          </span>
        </Button>
      </div>
    </div>
  );
};
