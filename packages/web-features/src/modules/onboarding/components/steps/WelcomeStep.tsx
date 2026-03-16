import React from "react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { cn } from "@corely/web-shared/shared/lib/utils";

export const WelcomeStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const { t } = useTranslation();
  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || t("common.next");

  return (
    <div
      className="flex flex-col items-start text-left animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-welcome"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <Sparkles className="h-10 w-10" />
      </div>

      <div className="space-y-8 mb-16">
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent border border-accent/20">
            {t("onboarding.welcome.badge") || "New Experience"}
          </span>
          <h1
            className="text-6xl font-black tracking-tight sm:text-7xl lg:text-8xl bg-gradient-to-br from-foreground via-foreground to-foreground/40 bg-clip-text text-transparent leading-[0.95]"
            data-testid="onboarding-step-title"
          >
            {title}
          </h1>
        </div>
        <p
          className="max-w-xl text-2xl text-muted-foreground/80 leading-relaxed font-medium"
          data-testid="onboarding-step-description"
        >
          {desc}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
        <Button
          size="lg"
          className="h-20 px-12 rounded-[2rem] text-xl font-black bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] transition-all duration-500 group gap-4 shadow-2xl shadow-accent/20"
          onClick={() => onAdvance()}
          disabled={isSaving}
          data-testid="onboarding-welcome-next"
        >
          <span>{cta}</span>
          <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-2" />
        </Button>
      </div>

      <div className="mt-16 flex items-center gap-4 text-muted-foreground/40">
        <div className="h-px w-12 bg-current" />
        <span className="text-xs font-bold uppercase tracking-[0.2em]">
          {t("onboarding.welcome.footer") || "Powered by Corely AI"}
        </span>
      </div>
    </div>
  );
};
