import React from "react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";

export const WelcomeStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const { t } = useTranslation();
  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || t("common.next");

  return (
    <div
      className="flex flex-col items-center justify-center p-6 text-center lg:p-12"
      data-testid="onboarding-step-welcome"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-8 w-8" />
      </div>

      <h1
        className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl"
        data-testid="onboarding-step-title"
      >
        {title}
      </h1>
      <p
        className="mb-10 max-w-lg text-lg text-muted-foreground"
        data-testid="onboarding-step-description"
      >
        {desc}
      </p>

      <Button
        size="lg"
        className="group w-full gap-2 sm:w-auto"
        onClick={() => onAdvance()}
        disabled={isSaving}
        data-testid="onboarding-welcome-next"
      >
        <span>{cta}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>

      {/* Optional secondary action like a demo video could go here */}
    </div>
  );
};
