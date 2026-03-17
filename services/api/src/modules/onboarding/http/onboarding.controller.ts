import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { CompleteOnboardingInputSchema, UpsertOnboardingStepInputSchema } from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import type { ContextAwareRequest } from "@/shared/request-context";
import { AuthGuard } from "@/modules/identity";
import { GetOnboardingProgressQuery } from "../application/use-cases/get-onboarding-progress.query";
import { UpsertOnboardingStepUseCase } from "../application/use-cases/upsert-onboarding-step.usecase";
import { CompleteOnboardingUseCase } from "../application/use-cases/complete-onboarding.usecase";

@Controller("onboarding")
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(
    private readonly getProgressQuery: GetOnboardingProgressQuery,
    private readonly upsertStepUseCase: UpsertOnboardingStepUseCase,
    private readonly completeUseCase: CompleteOnboardingUseCase
  ) {}

  /** GET /onboarding/:journeyKey/progress */
  @Get(":journeyKey/progress")
  async getProgress(@Req() req: ContextAwareRequest, @Param("journeyKey") journeyKey: string) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getProgressQuery.execute({ journeyKey }, ctx);
    return mapResultToHttp(result);
  }

  /** POST /onboarding/:journeyKey/step — upsert a single step state */
  @Post(":journeyKey/step")
  async upsertStep(
    @Req() req: ContextAwareRequest,
    @Param("journeyKey") journeyKey: string,
    @Body() body: unknown
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = UpsertOnboardingStepInputSchema.parse({
      ...(body as object),
      journeyKey,
    });
    const result = await this.upsertStepUseCase.execute(parsed, ctx);
    return mapResultToHttp(result);
  }

  /** POST /onboarding/:journeyKey/complete */
  @Post(":journeyKey/complete")
  async complete(
    @Req() req: ContextAwareRequest,
    @Param("journeyKey") journeyKey: string,
    @Body() body: unknown
  ) {
    const ctx = buildUseCaseContext(req);
    const parsed = CompleteOnboardingInputSchema.parse({
      ...(body as object),
      journeyKey,
    });
    const result = await this.completeUseCase.execute(parsed, ctx);
    return mapResultToHttp(result);
  }
}
