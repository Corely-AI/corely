import React from "react";
import { Button, Card, CardHeader, CardTitle, CardDescription } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { MessageSquarePlus, Share2, Sparkles, Plus, Play } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { useNavigate } from "react-router-dom";

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
      className="mx-auto flex max-w-2xl flex-col p-6 lg:p-12"
      data-testid="onboarding-step-post-value"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <Sparkles className="h-8 w-8" />
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight" data-testid="onboarding-step-title">
        {title}
      </h1>
      <p className="mb-10 text-lg text-muted-foreground" data-testid="onboarding-step-description">
        {desc}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Card
          className="hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => navigate("/settings/team")}
        >
          <CardHeader className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <Share2 className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">{t("onboarding.postValue.inviteTitle")}</CardTitle>
            </div>
            <CardDescription>{t("onboarding.postValue.inviteDesc")}</CardDescription>
            <div className="mt-4 text-sm font-medium text-primary flex items-center gap-1">
              <Plus className="w-4 h-4" /> {t("onboarding.postValue.inviteAction")}
            </div>
          </CardHeader>
        </Card>

        <Card
          className="hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => navigate("/settings/cash")}
        >
          <CardHeader className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">
                {t("onboarding.postValue.categoriesTitle")}
              </CardTitle>
            </div>
            <CardDescription>{t("onboarding.postValue.categoriesDesc")}</CardDescription>
            <div className="mt-4 text-sm font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1">
              <Plus className="w-4 h-4" /> {t("onboarding.postValue.categoriesAction")}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button
          size="lg"
          className="group gap-2 w-full sm:w-auto px-8"
          onClick={handleFinish}
          disabled={isSaving}
          data-testid="onboarding-post-finish"
        >
          <span>{cta}</span>
          <Play className="h-4 w-4 transition-transform group-hover:scale-110" />
        </Button>
      </div>
    </div>
  );
};
