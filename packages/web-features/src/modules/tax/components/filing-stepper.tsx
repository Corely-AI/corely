import React from "react";
import { cn } from "@corely/web-shared/shared/lib/utils";

export type FilingStepKey = "review" | "submit" | "pay";

type FilingStep = {
  key: FilingStepKey;
  label: string;
  disabled?: boolean;
};

type FilingStepperProps = {
  steps: FilingStep[];
  activeStep: FilingStepKey;
  onStepChange: (step: FilingStepKey) => void;
};

export function FilingStepper({ steps, activeStep, onStepChange }: FilingStepperProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="tax-filing-stepper">
      {steps.map((step) => {
        const isActive = step.key === activeStep;
        const isDisabled = step.disabled ?? false;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepChange(step.key)}
            disabled={isDisabled}
            className={cn(
              "px-3 py-2 rounded-full text-sm font-medium border transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
