import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  OnboardingJourneyConfig,
  OnboardingProgress,
  OnboardingStepStatus,
  OnboardingStepState,
} from "@corely/contracts";
import { onboardingApi } from "./onboarding-api";

export const onboardingKeys = {
  all: ["onboarding"] as const,
  progress: (journeyKey: string) => [...onboardingKeys.all, "progress", journeyKey] as const,
};

export interface UseOnboardingOptions {
  config: OnboardingJourneyConfig;
  onCompleted?: () => void;
}

export const useOnboarding = ({ config, onCompleted }: UseOnboardingOptions) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: onboardingKeys.progress(config.journeyKey),
    queryFn: () => onboardingApi.getProgress(config.journeyKey),
    staleTime: 5 * 60 * 1000,
  });

  const progress: OnboardingProgress | undefined = query.data?.progress;
  const isLoaded = query.isSuccess;

  // Find current step based on config order
  const getNextIncompleteStepId = (prog?: OnboardingProgress): string | undefined => {
    if (!prog) {
      return config.steps[0]?.id;
    }
    if (prog.dismissed || prog.completedAt) {
      return undefined;
    }

    for (const step of config.steps) {
      const state = prog.steps[step.id];
      if (!state || (state.status !== "completed" && state.status !== "skipped")) {
        return step.id;
      }
    }
    return undefined; // All steps done
  };

  const currentStepId =
    progress?.currentStepId ?? getNextIncompleteStepId(progress) ?? config.steps[0]?.id;
  const currentStepConfig = config.steps.find((s) => s.id === currentStepId);

  const upsertStepMutation = useMutation({
    mutationFn: async ({
      stepId,
      status,
      answers,
      meta,
      nextStepId,
    }: {
      stepId: string;
      status: OnboardingStepStatus;
      answers?: Record<string, unknown>;
      meta?: Record<string, unknown>;
      nextStepId?: string;
    }) => {
      // Optimistic logic would go here if needed, but for now just mutate
      const reachedFirstValue = config.steps.find((s) => s.id === stepId)?.isFirstValueMilestone
        ? true
        : undefined;
      const reachedFirstClose = config.steps.find((s) => s.id === stepId)?.isFirstCloseMilestone
        ? true
        : undefined;

      return onboardingApi.upsertStep(config.journeyKey, {
        moduleKey: config.moduleKey,
        stepId,
        status,
        answers,
        meta,
        nextStepId,
        reachedFirstValue,
        reachedFirstClose,
        locale: progress?.locale,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingKeys.progress(config.journeyKey), {
        found: true,
        progress: data.progress,
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      onboardingApi.complete(config.journeyKey, {
        moduleKey: config.moduleKey,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingKeys.progress(config.journeyKey), {
        found: true,
        progress: data.progress,
      });
      onCompleted?.();
    },
  });

  // Calculate overall completeness
  const totalSteps = config.steps.length;
  const completedSteps = progress
    ? Object.values(progress.steps).filter(
        (s) => s.status === "completed" || s.status === "skipped"
      ).length
    : 0;
  const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const isComplete = percentComplete === 100 || !!progress?.completedAt;

  return {
    progress,
    isLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    currentStepId,
    currentStepConfig,
    percentComplete,
    isComplete,
    upsertStep: upsertStepMutation.mutateAsync,
    isSaving: upsertStepMutation.isPending,
    completeJourney: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
  };
};
