import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { OnboardingController } from "./http/onboarding.controller";
import { ONBOARDING_PROGRESS_PORT } from "./application/ports/onboarding.ports";
import { ExtKvOnboardingProgressAdapter } from "./infrastructure/ext-kv-onboarding-progress.adapter";
import { GetOnboardingProgressQuery } from "./application/use-cases/get-onboarding-progress.query";
import { UpsertOnboardingStepUseCase } from "./application/use-cases/upsert-onboarding-step.usecase";
import { CompleteOnboardingUseCase } from "./application/use-cases/complete-onboarding.usecase";

@Module({
  imports: [DataModule, IdentityModule],
  controllers: [OnboardingController],
  providers: [
    ExtKvOnboardingProgressAdapter,
    {
      provide: ONBOARDING_PROGRESS_PORT,
      useExisting: ExtKvOnboardingProgressAdapter,
    },
    GetOnboardingProgressQuery,
    UpsertOnboardingStepUseCase,
    CompleteOnboardingUseCase,
  ],
  exports: [GetOnboardingProgressQuery, UpsertOnboardingStepUseCase, CompleteOnboardingUseCase],
})
export class OnboardingModule {}
