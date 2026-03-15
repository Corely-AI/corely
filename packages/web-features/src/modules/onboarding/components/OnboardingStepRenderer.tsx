import React from "react";
import type {
  OnboardingJourneyConfig,
  OnboardingStepConfig,
  OnboardingStepType,
} from "@corely/contracts";
import { useOnboarding } from "../engine/use-onboarding";
import { OnboardingAIHelper } from "./OnboardingAIHelper";
import { cn } from "@corely/ui";

// Generic props for any step component
export interface StepComponentProps {
  config: OnboardingStepConfig;
  locale: string;
  onAdvance: (answers?: Record<string, unknown>, meta?: Record<string, unknown>) => void;
  onSkip: () => void;
  isSaving: boolean;
  className?: string;
}

// Registry to lazily map step types to React components
// (In a real app, this might use React.lazy or be injected to avoid circular deps)
export const STEP_REGISTRY: Partial<
  Record<OnboardingStepType, React.ComponentType<StepComponentProps>>
> = {};

export interface OnboardingStepRendererProps {
  config: OnboardingJourneyConfig;
  onCompleted?: () => void;
}

export const OnboardingStepRenderer = ({ config, onCompleted }: OnboardingStepRendererProps) => {
  const { currentStepConfig, progress, isLoaded, upsertStep, isSaving } = useOnboarding({
    config,
    onCompleted,
  });

  if (!isLoaded || !currentStepConfig) {
    return null;
  }

  const locale = progress?.locale || config.defaultLocale;

  // Determine the next step intelligently (handling linear vs branching)
  const determineNextStep = (answers?: Record<string, unknown>) => {
    let nextStepId = currentStepConfig.nextStepId;

    if (currentStepConfig.branchingRules && answers) {
      for (const rule of currentStepConfig.branchingRules) {
        if (answers[rule.field] === rule.value) {
          if (rule.nextStepId) {
            nextStepId = rule.nextStepId;
            break;
          }
        }
      }
    }

    // Default linear fallback if not specified
    if (!nextStepId) {
      const idx = config.steps.findIndex((s) => s.id === currentStepConfig.id);
      nextStepId = config.steps[idx + 1]?.id;
    }

    return nextStepId;
  };

  const handleAdvance = async (
    answers?: Record<string, unknown>,
    meta?: Record<string, unknown>
  ) => {
    const nextStepId = determineNextStep(answers);
    const existingAnswers = progress?.steps[currentStepConfig.id]?.answers || {};
    const mergedAnswers = { ...existingAnswers, ...answers };

    await upsertStep({
      stepId: currentStepConfig.id,
      status: "completed",
      nextStepId,
      answers: Object.keys(mergedAnswers).length > 0 ? mergedAnswers : undefined,
      meta,
    });
  };

  const handleSkip = async () => {
    if (!currentStepConfig.skippable && !currentStepConfig.optional) {
      return;
    }
    const nextStepId = determineNextStep();

    await upsertStep({
      stepId: currentStepConfig.id,
      status: "skipped",
      nextStepId,
    });
  };

  const Component = STEP_REGISTRY[currentStepConfig.type];

  if (!Component) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <p>Step component not found for type: {currentStepConfig.type}</p>
        <button className="mt-4 text-primary underline" onClick={() => handleSkip()}>
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8 lg:flex-row">
      <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Component
          config={currentStepConfig}
          locale={locale}
          onAdvance={handleAdvance}
          onSkip={handleSkip}
          isSaving={isSaving}
        />
      </div>

      {currentStepConfig.aiHelpContext && (
        <div className="w-full shrink-0 lg:w-72 lg:pt-16 xl:w-80 animate-in fade-in slide-in-from-right-8 duration-700">
          <OnboardingAIHelper step={currentStepConfig} locale={locale} />
        </div>
      )}
    </div>
  );
};
