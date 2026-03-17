import React from "react";
import { Button, Card, CardHeader, CardTitle, CardDescription } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { Sparkles, Plus, Users, Settings2, ArrowRight } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { useNavigate } from "react-router-dom";
import { cn } from "@corely/web-shared/shared/lib/utils";

export const PostValueStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const { t } = useTranslation();
  const analytics = useOnboardingAnalytics();
  const navigate = useNavigate();

  const handleFinish = () => {
    analytics.track("onboarding.completed", {});
    onAdvance();
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || t("onboarding.postValue.cta");

  return (
    <div
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-post-value"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent text-accent-foreground shadow-2xl glow-accent ring-4 ring-accent/20">
        <Sparkles className="h-10 w-10" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl">
        <Card
          className="group relative overflow-hidden rounded-[2.5rem] border-white/5 bg-white/[0.02] transition-all duration-700 hover:bg-accent/[0.04] hover:border-accent/40 hover:-translate-y-2 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-accent/10"
          onClick={() => navigate("/settings/team")}
        >
          <CardHeader className="p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 mb-8 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-700 shadow-lg">
              <Users className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-black mb-3 group-hover:text-blue-400 transition-colors tracking-tight">
              {t("onboarding.postValue.inviteTitle")}
            </CardTitle>
            <CardDescription className="text-lg leading-relaxed text-muted-foreground/50 font-medium">
              {t("onboarding.postValue.inviteDesc")}
            </CardDescription>
            <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
              <span className="text-md font-black text-foreground group-hover:text-blue-400 transition-colors uppercase tracking-widest">
                {t("onboarding.postValue.inviteAction")}
              </span>
              <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                <Plus className="w-5 h-5" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="group relative overflow-hidden rounded-[2.5rem] border-white/5 bg-white/[0.02] transition-all duration-700 hover:bg-amber-500/[0.04] hover:border-amber-500/40 hover:-translate-y-2 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-amber-500/10"
          onClick={() => navigate("/settings/cash")}
        >
          <CardHeader className="p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-8 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-700 shadow-lg">
              <Settings2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-black mb-3 group-hover:text-amber-500 transition-colors tracking-tight">
              {t("onboarding.postValue.categoriesTitle")}
            </CardTitle>
            <CardDescription className="text-lg leading-relaxed text-muted-foreground/50 font-medium">
              {t("onboarding.postValue.categoriesDesc")}
            </CardDescription>
            <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
              <span className="text-md font-black text-foreground group-hover:text-amber-500 transition-colors uppercase tracking-widest">
                {t("onboarding.postValue.categoriesAction")}
              </span>
              <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                <Plus className="w-5 h-5" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="w-full sm:w-auto">
        <Button
          size="lg"
          className="h-20 px-16 rounded-[2rem] text-xl font-black bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] transition-all duration-500 group shadow-2xl shadow-accent/20"
          onClick={handleFinish}
          disabled={isSaving}
          data-testid="onboarding-post-finish"
        >
          <span className="flex items-center gap-4">
            {cta}
            <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-2" />
          </span>
        </Button>
      </div>
    </div>
  );
};
