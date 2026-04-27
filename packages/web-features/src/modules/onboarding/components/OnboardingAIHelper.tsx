import React from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, cn } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { Bot, Sparkles, MessageCircleQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { OnboardingStepConfig } from "@corely/contracts";
import { useOnboardingAnalytics } from "../engine/use-onboarding-analytics";

export interface OnboardingAIHelperProps {
  step: OnboardingStepConfig;
  locale: string;
  className?: string;
}

export const OnboardingAIHelper = ({ step, locale, className }: OnboardingAIHelperProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const analytics = useOnboardingAnalytics();

  if (!step.aiHelpContext) {
    return null;
  }

  const handleOpenHelp = () => {
    analytics.track("onboarding.ai_helper_opened", { stepId: step.id, type: step.type });
    navigate("/assistant");
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-6 transition-all duration-300 hover:bg-white/[0.05]",
        className
      )}
      data-testid="onboarding-ai-helper"
    >
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Bot className="h-12 w-12" />
      </div>

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-2 text-accent">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {t("onboarding.aiTipTitle")}
          </span>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground/90 leading-tight">
            {t("onboarding.aiHelpTitle")}
          </h4>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            {t("onboarding.aiHelpPrompt")}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-2 bg-white/5 border border-white/5 hover:bg-accent/10 hover:border-accent/20 hover:text-accent transition-all duration-300 rounded-xl py-5"
          onClick={handleOpenHelp}
          data-testid="onboarding-ai-helper-open"
        >
          <MessageCircleQuestion className="h-4 w-4" />
          <span className="text-sm font-medium">{t("onboarding.askAssistant")}</span>
        </Button>
      </div>
    </div>
  );
};
