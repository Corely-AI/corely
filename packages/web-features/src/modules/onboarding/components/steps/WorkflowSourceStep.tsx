import React, { useState } from "react";
import { Button, RadioGroup, RadioGroupItem, Label, cn } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Calculator, Computer, LayoutDashboard } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

const WORKFLOW_OPTIONS = [
  { id: "paper", icon: BookOpen },
  { id: "excel", icon: Calculator },
  { id: "pos", icon: Computer },
  { id: "software", icon: LayoutDashboard },
];

export const WorkflowSourceStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const analytics = useOnboardingAnalytics();

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || "Continue";

  const handleNext = () => {
    if (selected) {
      analytics.track("onboarding.workflow_source_selected", { source: selected });
      onAdvance({ workflowSource: selected });
    }
  };

  return (
    <div
      className="mx-auto flex max-w-lg flex-col p-6 lg:p-12"
      data-testid="onboarding-step-workflow-source"
    >
      <h1
        className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl"
        data-testid="onboarding-step-title"
      >
        {title}
      </h1>
      <p className="mb-8 text-muted-foreground" data-testid="onboarding-step-description">
        {desc}
      </p>

      <RadioGroup
        value={selected || ""}
        onValueChange={setSelected}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {WORKFLOW_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <Label
              key={opt.id}
              htmlFor={`source-${opt.id}`}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center transition-colors hover:bg-accent",
                selected === opt.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              data-testid={`onboarding-workflow-option-${opt.id}`}
            >
              <RadioGroupItem value={opt.id} id={`source-${opt.id}`} className="sr-only" />
              <Icon className="h-8 w-8" />
              <span className="font-semibold text-foreground">
                {t(`onboarding.workflowOptions.${opt.id}`)}
              </span>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          className="group gap-2"
          onClick={handleNext}
          disabled={!selected || isSaving}
          data-testid="onboarding-workflow-next"
        >
          <span>{cta}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
};
