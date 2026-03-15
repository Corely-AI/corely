import { Inject, Injectable } from "@nestjs/common";
import { type CompleteOnboardingInput, type OnboardingProgress } from "@corely/contracts";
import {
  BaseUseCase,
  RequireTenant,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
} from "@corely/kernel";
import { ONBOARDING_PROGRESS_PORT, type OnboardingProgressPort } from "../ports/onboarding.ports";

@RequireTenant()
@Injectable()
export class CompleteOnboardingUseCase extends BaseUseCase<
  CompleteOnboardingInput,
  { progress: OnboardingProgress }
> {
  constructor(
    @Inject(ONBOARDING_PROGRESS_PORT)
    private readonly progressRepo: OnboardingProgressPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: CompleteOnboardingInput,
    ctx: UseCaseContext
  ): Promise<Result<{ progress: OnboardingProgress }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const progress = await this.progressRepo.get(tenantId, workspaceId, input.journeyKey);
    if (!progress) {
      throw new ValidationError("Onboarding progress not found — cannot complete");
    }

    const completed: OnboardingProgress = {
      ...progress,
      completedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };

    await this.progressRepo.upsert(tenantId, completed);
    return ok({ progress: completed });
  }
}
