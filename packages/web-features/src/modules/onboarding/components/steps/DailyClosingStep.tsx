import React from "react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { BookCheck, CalendarCheck, PlayCircle } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

export const DailyClosingStep = ({
  config,
  locale,
  onAdvance,
  onSkip,
  isSaving,
}: StepComponentProps) => {
  const { t } = useTranslation();
  const analytics = useOnboardingAnalytics();

  const handleNext = () => {
    analytics.track("onboarding.closing_education_viewed", {});
    onAdvance();
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || t("onboarding.allSet");

  return (
    <div
      className="mx-auto flex max-w-lg flex-col p-6 lg:p-12 text-center"
      data-testid="onboarding-step-daily-closing"
    >
      <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
        <BookCheck className="h-8 w-8" />
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight" data-testid="onboarding-step-title">
        {title}
      </h1>
      <p className="mb-10 text-lg text-muted-foreground" data-testid="onboarding-step-description">
        {desc}
      </p>

      <div
        className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl border bg-muted group cursor-pointer"
        data-testid="onboarding-daily-video"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20 z-10">
          <PlayCircle className="h-12 w-12 text-white/90 drop-shadow-md group-hover:scale-110 transition-transform" />
          <span className="mt-3 text-sm font-medium text-white/90 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
            {t("onboarding.closing.watchTutorial")}
          </span>
        </div>
        <img
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2811&auto=format&fit=crop"
          alt="Closing register"
          className="h-full w-full object-cover blur-[2px] opacity-60"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center mt-6">
        <Button
          variant="outline"
          size="lg"
          onClick={onSkip}
          disabled={isSaving}
          className="w-full sm:w-auto"
          data-testid="onboarding-daily-skip"
        >
          {t("onboarding.closing.skipLabel")}
        </Button>
        <Button
          size="lg"
          className="gap-2 w-full sm:w-auto"
          onClick={handleNext}
          disabled={isSaving}
          data-testid="onboarding-daily-next"
        >
          <CalendarCheck className="h-4 w-4" />
          <span>{cta}</span>
        </Button>
      </div>
    </div>
  );
};
