import React from "react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { BookCheck, ArrowRight, Play, Sparkles } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { cn } from "@corely/web-shared/shared/lib/utils";

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
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-daily-closing"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <BookCheck className="h-10 w-10" />
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

      <div
        className="group relative mb-16 aspect-video w-full max-w-3xl overflow-hidden rounded-[3rem] border border-white/5 bg-white/[0.02] cursor-pointer shadow-2xl transition-all duration-700 hover:border-accent/40 hover:glow-accent-subtle"
        data-testid="onboarding-daily-video"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[4px] transition-all duration-700 group-hover:bg-black/30 group-hover:backdrop-blur-none z-10">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-2xl shadow-accent/20 group-hover:scale-110 transition-all duration-700 glow-accent">
            <Play className="h-10 w-10 fill-current ml-2" />
          </div>
          <div className="mt-8 flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl backdrop-blur-xl border border-white/10 opacity-60 group-hover:opacity-100 group-hover:bg-accent/20 group-hover:border-accent/30 transition-all duration-500">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-black text-white uppercase tracking-widest whitespace-nowrap">
              {t("onboarding.closing.watchTutorial")}
            </span>
          </div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2811&auto=format&fit=crop"
          alt="Closing register"
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />

        {/* Progress bar mock */}
        <div className="absolute bottom-0 left-0 h-2 bg-accent/10 w-full z-20">
          <div className="h-full bg-accent w-1/3 shadow-[0_0_20px_rgba(var(--accent),0.6)]" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <Button
          size="lg"
          className="h-20 px-16 rounded-[2rem] text-xl font-black bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] transition-all duration-500 group shadow-2xl shadow-accent/20 w-full sm:w-auto"
          onClick={handleNext}
          disabled={isSaving}
          data-testid="onboarding-daily-next"
        >
          <span className="flex items-center gap-4">
            {cta}
            <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-2" />
          </span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-20 px-12 rounded-[2rem] text-xl font-black border-white/5 bg-white/[0.02] text-muted-foreground/50 hover:bg-white/5 hover:text-foreground transition-all duration-500 w-full sm:w-auto"
          onClick={onSkip}
          disabled={isSaving}
          data-testid="onboarding-daily-skip"
        >
          {t("onboarding.closing.skipLabel")}
        </Button>
      </div>
    </div>
  );
};
