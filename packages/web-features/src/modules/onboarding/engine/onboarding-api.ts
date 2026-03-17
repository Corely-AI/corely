import type {
  GetOnboardingProgressOutput,
  UpsertOnboardingStepInput,
  CompleteOnboardingInput,
  OnboardingProgress,
} from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";

const BASE = "/onboarding";

export const onboardingApi = {
  getProgress: async (journeyKey: string): Promise<GetOnboardingProgressOutput> => {
    const res = await apiClient.get<GetOnboardingProgressOutput>(`${BASE}/${journeyKey}/progress`);
    return res;
  },

  upsertStep: async (
    journeyKey: string,
    input: Omit<UpsertOnboardingStepInput, "journeyKey">
  ): Promise<{ progress: OnboardingProgress }> => {
    const res = await apiClient.post<{ progress: OnboardingProgress }>(
      `${BASE}/${journeyKey}/step`,
      input
    );
    return res;
  },

  complete: async (
    journeyKey: string,
    input: Omit<CompleteOnboardingInput, "journeyKey">
  ): Promise<{ progress: OnboardingProgress }> => {
    const res = await apiClient.post<{ progress: OnboardingProgress }>(
      `${BASE}/${journeyKey}/complete`,
      input
    );
    return res;
  },
};
