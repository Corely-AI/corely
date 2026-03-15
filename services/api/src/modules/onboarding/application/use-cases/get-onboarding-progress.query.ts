import { Inject, Injectable } from "@nestjs/common";
import { type GetOnboardingProgressOutput, OnboardingProgressSchema } from "@corely/contracts";
import {
  BaseUseCase,
  RequireTenant,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import { ONBOARDING_PROGRESS_PORT, type OnboardingProgressPort } from "../ports/onboarding.ports";

interface GetOnboardingProgressInput {
  journeyKey: string;
}

@RequireTenant()
@Injectable()
export class GetOnboardingProgressQuery extends BaseUseCase<
  GetOnboardingProgressInput,
  GetOnboardingProgressOutput
> {
  constructor(
    @Inject(ONBOARDING_PROGRESS_PORT)
    private readonly progressRepo: OnboardingProgressPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: GetOnboardingProgressInput,
    ctx: UseCaseContext
  ): Promise<Result<GetOnboardingProgressOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId!;

    const raw = await this.progressRepo.get(tenantId, workspaceId, input.journeyKey);
    if (!raw) {
      return ok({ found: false });
    }
    const progress = OnboardingProgressSchema.parse(raw);
    return ok({ found: true, progress });
  }
}
