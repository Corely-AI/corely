import React from "react";
import { Card, CardHeader, CardTitle, CardContent, Progress, cn } from "@corely/ui";
import { CheckCircle2, Circle } from "lucide-react";
import type { OnboardingJourneyConfig } from "@corely/contracts";
import { useOnboarding } from "../engine/use-onboarding";
import { useNavigate } from "react-router-dom";

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
  const { progress, isLoaded, percentComplete, isComplete } = useOnboarding({ config });
  const navigate = useNavigate();

  if (!isLoaded) {
    return null;
  }
  if (isComplete) {
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
    <Card className={cn("overflow-hidden border-border/50 bg-card/60 shadow-sm", className)}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {config.title[locale] || config.title[config.defaultLocale] || "Onboarding"}
          </CardTitle>
          <span className="text-xs font-medium text-muted-foreground">{percentComplete}%</span>
        </div>
        <Progress value={percentComplete} className="h-1.5" />
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <ul className="space-y-3">
          {config.checklistItems.map((item) => {
            const label = item.label[locale] || item.label[config.defaultLocale] || item.id;

            // Item is complete if all associated steps are complete/skipped
            const trackedStepIds = item.stepIds || (item.stepId ? [item.stepId] : []);
            const isItemComplete =
              trackedStepIds.length > 0 &&
              trackedStepIds.every((stepId) => {
                const stepState = progress?.steps[stepId];
                return stepState?.status === "completed" || stepState?.status === "skipped";
              });

            return (
              <li key={item.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleItemClick(item.deepLinkRoute)}
                  className={cn(
                    "group flex items-start gap-2 text-left disabled:cursor-default",
                    !item.deepLinkRoute && "cursor-default"
                  )}
                  disabled={!item.deepLinkRoute}
                >
                  <div className="mt-0.5 flex shrink-0 items-center justify-center">
                    {isItemComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      isItemComplete
                        ? "text-muted-foreground line-through decoration-muted-foreground/50"
                        : "font-medium hover:underline",
                      !item.deepLinkRoute && "hover:no-underline"
                    )}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};
