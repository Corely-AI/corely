import React from "react";
import type {
  OnboardingJourneyConfig,
  OnboardingProgress,
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
  progress: OnboardingProgress | undefined;
  onAdvance: (answers?: Record<string, unknown>, meta?: Record<string, unknown>) => void;
  onSkip: () => void;
  isSaving: boolean;
  className?: string;
}

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
  const [optimisticStepId, setOptimisticStepId] = React.useState<string | null>(null);

  if (!isLoaded || !currentStepConfig) {
    return null;
  }

  const locale = progress?.locale || config.defaultLocale;
  const resolvedStepId = optimisticStepId ?? currentStepConfig.id;
  const resolvedStepConfig =
    config.steps.find((step) => step.id === resolvedStepId) ?? currentStepConfig;

  React.useEffect(() => {
    if (!optimisticStepId) {
      return;
    }
    if (progress?.currentStepId === optimisticStepId) {
      setOptimisticStepId(null);
    }
  }, [optimisticStepId, progress?.currentStepId]);

  const determineNextStep = (answers?: Record<string, unknown>) => {
    let nextStepId = resolvedStepConfig.nextStepId;

    if (resolvedStepConfig.branchingRules && answers) {
      for (const rule of resolvedStepConfig.branchingRules) {
        if (answers[rule.field] === rule.value) {
          if (rule.nextStepId) {
            nextStepId = rule.nextStepId;
            break;
          }
        }
      }
    }

    if (!nextStepId) {
      const idx = config.steps.findIndex((s) => s.id === resolvedStepConfig.id);
      nextStepId = config.steps[idx + 1]?.id;
    }

    return nextStepId;
  };

  const handleAdvance = async (
    answers?: Record<string, unknown>,
    meta?: Record<string, unknown>
  ) => {
    const nextStepId = determineNextStep(answers);
    const existingAnswers = progress?.steps[resolvedStepConfig.id]?.answers || {};
    const mergedAnswers = { ...existingAnswers, ...answers };
    const nextLocale =
      typeof mergedAnswers.locale === "string" ? mergedAnswers.locale : progress?.locale;
    const workflowSource =
      typeof mergedAnswers.workflowSource === "string"
        ? mergedAnswers.workflowSource
        : progress?.workflowSource;

    if (nextStepId) {
      setOptimisticStepId(nextStepId);
    }
    try {
      await upsertStep({
        stepId: resolvedStepConfig.id,
        status: "completed",
        nextStepId,
        answers: Object.keys(mergedAnswers).length > 0 ? mergedAnswers : undefined,
        meta,
        locale: nextLocale,
        workflowSource,
      });
    } catch (error) {
      setOptimisticStepId(null);
      throw error;
    }
  };

  const handleSkip = async () => {
    if (!resolvedStepConfig.skippable && !resolvedStepConfig.optional) {
      return;
    }
    const nextStepId = determineNextStep();

    if (nextStepId) {
      setOptimisticStepId(nextStepId);
    }
    try {
      await upsertStep({
        stepId: resolvedStepConfig.id,
        status: "skipped",
        nextStepId,
      });
    } catch (error) {
      setOptimisticStepId(null);
      throw error;
    }
  };

  const Component = STEP_REGISTRY[resolvedStepConfig.type];

  if (!Component) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground animate-in fade-in duration-500">
        <p>Step component not found for type: {currentStepConfig.type}</p>
        <button className="mt-4 text-accent underline" onClick={() => handleSkip()}>
          Skip for now
        </button>
      </div>
    );
  }

  return (
    <div
      className="grid w-full grid-cols-1 gap-12 lg:grid-cols-12 xl:gap-24"
      data-testid="onboarding-step"
      data-step-id={resolvedStepConfig.id}
    >
      <div className="order-2 lg:col-span-8 lg:order-1 lg:max-w-2xl">
        <div
          key={resolvedStepConfig.id}
          className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both"
        >
          <Component
            config={resolvedStepConfig}
            locale={locale}
            progress={progress}
            onAdvance={handleAdvance}
            onSkip={handleSkip}
            isSaving={isSaving}
          />
        </div>
      </div>

      <div className="order-1 lg:col-span-4 lg:order-2">
        {resolvedStepConfig.aiHelpContext && (
          <div className="sticky top-24 pt-4 animate-in fade-in slide-in-from-right-8 duration-700 delay-150 ease-out fill-mode-both">
            <OnboardingAIHelper step={resolvedStepConfig} locale={locale} />
          </div>
        )}
      </div>
    </div>
  );
};
