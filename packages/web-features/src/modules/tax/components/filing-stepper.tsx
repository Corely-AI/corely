import React from "react";
import { Check } from "lucide-react";
import { cn } from "@corely/web-shared/shared/lib/utils";

export type FilingStepKey = "review" | "submit" | "pay";

export type FilingStep = {
  key: FilingStepKey;
  label: string;
  disabled?: boolean;
  completed?: boolean;
};

type FilingStepperProps = {
  steps: FilingStep[];
  activeStep: FilingStepKey;
  onStepChange: (step: FilingStepKey) => void;
};

export function FilingStepper({ steps, activeStep, onStepChange }: FilingStepperProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="tax-filing-stepper">
      {steps.map((step, index) => {
        const isActive = step.key === activeStep;
        const isDisabled = step.disabled ?? false;
        const isCompleted = step.completed ?? false;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepChange(step.key)}
            disabled={isDisabled}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border transition-colors",
              isActive && "bg-primary text-primary-foreground border-primary",
              !isActive && isCompleted && "bg-emerald-50 text-emerald-700 border-emerald-200",
              !isActive &&
                !isCompleted &&
                "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
            aria-current={isActive ? "step" : undefined}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                isActive && "bg-primary-foreground/20",
                !isActive && isCompleted && "bg-emerald-200",
                !isActive && !isCompleted && "bg-muted"
              )}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5" /> : null}
              {!isCompleted ? index + 1 : null}
            </span>
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
