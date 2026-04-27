import React, { useState } from "react";
import { Button, RadioGroup, RadioGroupItem, Label } from "@corely/ui";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Computer,
  LayoutDashboard,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { cn } from "@corely/web-shared/shared/lib/utils";

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
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || t("common.next");

  const handleNext = () => {
    if (selected) {
      analytics.track("onboarding.workflow_source_selected", { source: selected });
      onAdvance({ workflowSource: selected });
    }
  };

  return (
    <div
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-workflow-source"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <Settings2 className="h-10 w-10" />
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7">
          <RadioGroup
            value={selected || ""}
            onValueChange={setSelected}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2"
          >
            {WORKFLOW_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selected === opt.id;

              return (
                <Label
                  key={opt.id}
                  htmlFor={`source-${opt.id}`}
                  className={cn(
                    "group relative flex cursor-pointer flex-col items-start gap-6 rounded-[2.5rem] border p-8 transition-all duration-500",
                    isSelected
                      ? "border-accent/40 bg-accent/[0.03] shadow-2xl shadow-accent/10 ring-1 ring-accent/20"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                  )}
                  data-testid={`onboarding-workflow-option-${opt.id}`}
                >
                  <RadioGroupItem value={opt.id} id={`source-${opt.id}`} className="sr-only" />

                  <div
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-500",
                      isSelected
                        ? "bg-accent text-accent-foreground glow-accent shadow-lg"
                        : "bg-white/5 text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon className="h-8 w-8" />
                  </div>

                  <div className="space-y-2">
                    <span
                      className={cn(
                        "font-black text-xl transition-colors tracking-tight",
                        isSelected
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground/80"
                      )}
                    >
                      {t(`onboarding.workflowOptions.${opt.id}`)}
                    </span>
                    <p className="text-sm text-muted-foreground/50 leading-relaxed font-medium">
                      {t(`onboarding.workflowOptions.${opt.id}Desc`)}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="absolute top-8 right-8 h-3 w-3 rounded-full bg-accent animate-pulse shadow-[0_0_15px_rgba(var(--accent),0.5)]" />
                  )}
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        <div className="lg:col-span-5 hidden lg:block">
          {selected ? (
            <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 animate-in fade-in slide-in-from-right-8 duration-700 relative overflow-hidden group">
              <div className="absolute -top-24 -right-24 h-64 w-64 bg-accent/10 blur-[100px] rounded-full group-hover:bg-accent/20 transition-colors duration-1000" />

              <div className="relative space-y-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-accent tracking-tight">
                    {t("onboarding.workflow.insightTitle")}
                  </h3>
                  <p className="text-lg text-muted-foreground/80 leading-relaxed font-medium italic">
                    {t(
                      `onboarding.status.workflow${selected.charAt(0).toUpperCase() + selected.slice(1)}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full rounded-[2.5rem] border-2 border-dashed border-white/5 flex items-center justify-center p-12 text-center group">
              <p className="text-muted-foreground/30 font-black uppercase tracking-[0.2em] group-hover:text-muted-foreground/40 transition-colors">
                {t("onboarding.workflow.selectHint")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 w-full sm:w-auto">
        <Button
          size="lg"
          className={cn(
            "h-20 px-14 rounded-[2rem] text-xl font-black transition-all duration-500 group",
            selected
              ? "bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] shadow-2xl shadow-accent/20"
              : "bg-white/5 text-muted-foreground/30 border border-white/5 cursor-not-allowed"
          )}
          onClick={handleNext}
          disabled={!selected || isSaving}
          data-testid="onboarding-workflow-next"
        >
          <span className="flex items-center gap-4">
            {cta}
            <ArrowRight
              className={cn(
                "h-6 w-6 transition-transform duration-500",
                selected && "group-hover:translate-x-2"
              )}
            />
          </span>
        </Button>
      </div>
    </div>
  );
};
