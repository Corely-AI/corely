import { Inject, Injectable } from "@nestjs/common";
import {
  type UpsertOnboardingStepInput,
  OnboardingProgressSchema,
  type OnboardingProgress,
} from "@corely/contracts";
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
export class UpsertOnboardingStepUseCase extends BaseUseCase<
  UpsertOnboardingStepInput,
  { progress: OnboardingProgress }
> {
  constructor(
    @Inject(ONBOARDING_PROGRESS_PORT)
    private readonly progressRepo: OnboardingProgressPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: UpsertOnboardingStepInput,
    ctx: UseCaseContext
  ): Promise<Result<{ progress: OnboardingProgress }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const now = new Date().toISOString();

    // Load or create progress
    let progress = await this.progressRepo.get(tenantId, workspaceId, input.journeyKey);

    if (!progress) {
      progress = OnboardingProgressSchema.parse({
        journeyKey: input.journeyKey,
        moduleKey: input.moduleKey,
        tenantId,
        workspaceId,
        locale: input.locale ?? "en",
        currentStepId: input.stepId,
        steps: {},
        reachedFirstValue: false,
        reachedFirstClose: false,
        startedAt: now,
        lastActivityAt: now,
      });
    }

    // Update step state — idempotent: re-submitting the same stepId + status is safe
    progress = {
      ...progress,
      steps: {
        ...progress.steps,
        [input.stepId]: {
          stepId: input.stepId,
          status: input.status,
          answers: input.answers ?? progress.steps[input.stepId]?.answers,
          meta: input.meta ?? progress.steps[input.stepId]?.meta,
          ...(input.status === "completed" && { completedAt: now }),
          ...(input.status === "skipped" && { skippedAt: now }),
        },
      },
      currentStepId: input.nextStepId ?? progress.currentStepId,
      locale: input.locale ?? progress.locale,
      workflowSource: input.workflowSource ?? progress.workflowSource,
      reachedFirstValue: input.reachedFirstValue ?? progress.reachedFirstValue,
      reachedFirstClose: input.reachedFirstClose ?? progress.reachedFirstClose,
      createdEntityIds: {
        ...progress.createdEntityIds,
        ...input.createdEntityIds,
      },
      lastActivityAt: now,
    };

    await this.progressRepo.upsert(tenantId, progress);
    return ok({ progress });
  }
}
