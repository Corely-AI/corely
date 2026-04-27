import React from "react";
import { Progress, cn } from "@corely/ui";
import { Check } from "lucide-react";
import type { OnboardingJourneyConfig } from "@corely/contracts";
import { useOnboarding } from "../engine/use-onboarding";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export interface OnboardingChecklistProps {
  config: OnboardingJourneyConfig;
  className?: string;
  onItemClick?: (route: string) => void;
}

export const OnboardingChecklist = ({
  config,
  className,
  onItemClick,
}: OnboardingChecklistProps) => {
  const { t } = useTranslation();
  const { progress, isLoaded, percentComplete, isComplete, currentStepConfig } = useOnboarding({
    config,
  });
  const navigate = useNavigate();

  if (!isLoaded || isComplete) {
    return null;
  }

  const handleItemClick = (route?: string) => {
    if (route) {
      if (onItemClick) {
        onItemClick(route);
      } else {
        navigate(route);
      }
    }
  };

  const locale = progress?.locale || config.defaultLocale;

  return (
    <div className={cn("flex flex-col gap-8", className)} data-testid="onboarding-checklist">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {config.title[locale] ||
              config.title[config.defaultLocale] ||
              t("onboarding.progressTitle")}
          </h3>
          <span
            className="text-[11px] font-bold text-accent/80 tabular-nums"
            data-testid="onboarding-checklist-progress"
          >
            {percentComplete}%
          </span>
        </div>
        <Progress value={percentComplete} className="h-1.5 bg-border/20" />
      </div>

      <ul className="space-y-4">
        {config.checklistItems.map((item) => {
          const label = item.label[locale] || item.label[config.defaultLocale] || item.id;
          const trackedStepIds = item.stepIds || (item.stepId ? [item.stepId] : []);

          const isItemComplete =
            trackedStepIds.length > 0 &&
            trackedStepIds.every((stepId) => {
              const stepState = progress?.steps[stepId];
              return stepState?.status === "completed" || stepState?.status === "skipped";
            });

          const isCurrent = currentStepConfig && trackedStepIds.includes(currentStepConfig.id);

          return (
            <li
              key={item.id}
              className="flex flex-col gap-1"
              data-testid={`onboarding-checklist-item-${item.id}`}
              data-status={isItemComplete ? "completed" : "pending"}
            >
              <button
                type="button"
                onClick={() => handleItemClick(item.deepLinkRoute)}
                className={cn(
                  "group relative flex items-center gap-3 py-1 text-left transition-all duration-300",
                  !item.deepLinkRoute && "cursor-default",
                  isCurrent ? "translate-x-1" : "hover:translate-x-1"
                )}
                disabled={!item.deepLinkRoute}
                data-testid={`onboarding-checklist-action-${item.id}`}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isItemComplete
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                      : isCurrent
                        ? "border-accent bg-accent/10 text-accent glow-accent"
                        : "border-border/50 text-muted-foreground/40 group-hover:border-border group-hover:text-muted-foreground"
                  )}
                >
                  {isItemComplete ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isCurrent ? "bg-accent" : "bg-current opacity-20"
                      )}
                    />
                  )}
                </div>

                <span
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isItemComplete
                      ? "text-muted-foreground/60"
                      : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground/80"
                  )}
                >
                  {label}
                </span>

                {isCurrent && (
                  <div className="absolute left-[-1.5rem] h-4 w-1 rounded-r-full bg-accent animate-pulse" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
