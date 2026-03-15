import type { OnboardingProgress } from "@corely/contracts";

export const ONBOARDING_PROGRESS_PORT = "ONBOARDING_PROGRESS_PORT";

export interface OnboardingProgressPort {
  get(
    tenantId: string,
    workspaceId: string,
    journeyKey: string
  ): Promise<OnboardingProgress | null>;

  upsert(tenantId: string, progress: OnboardingProgress): Promise<void>;
}
