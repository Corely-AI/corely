import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { UpsertPortfolioProfileInput, PortfolioProfile } from "@corely/contracts";
import { assertPublishableProfile } from "../../domain/portfolio-rules";
import {
  PROFILE_REPOSITORY_PORT,
  type ProfileRepositoryPort,
} from "../ports/profile-repository.port";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioProfileDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type UpsertProfileParams = UpsertPortfolioProfileInput & { showcaseId: string };

@RequireTenant()
@Injectable()
export class UpsertProfileUseCase extends BaseUseCase<UpsertProfileParams, PortfolioProfile> {
  constructor(
    @Inject(PROFILE_REPOSITORY_PORT) private readonly profileRepo: ProfileRepositoryPort,
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: UpsertProfileParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioProfile, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const showcase = await this.showcaseRepo.findById(
      ctx.tenantId!,
      ctx.workspaceId,
      input.showcaseId
    );
    if (!showcase) {
      return err(new NotFoundError("Showcase not found"));
    }

    const existing = await this.profileRepo.findByShowcaseId(
      ctx.tenantId!,
      ctx.workspaceId,
      input.showcaseId
    );

    const merged = {
      introLine: input.introLine ?? existing?.introLine ?? null,
      headline: input.headline ?? existing?.headline ?? null,
      subheadline: input.subheadline ?? existing?.subheadline ?? null,
      aboutShort: input.aboutShort ?? existing?.aboutShort ?? null,
      aboutLong: input.aboutLong ?? existing?.aboutLong ?? null,
      focusBullets: input.focusBullets ?? existing?.focusBullets ?? [],
      ctaTitle: input.ctaTitle ?? existing?.ctaTitle ?? null,
      ctaText: input.ctaText ?? existing?.ctaText ?? null,
      ctaUrl: input.ctaUrl ?? existing?.ctaUrl ?? null,
      techStacks: input.techStacks ?? existing?.techStacks ?? [],
      socialLinks: input.socialLinks ?? existing?.socialLinks ?? null,
      homeSections: input.homeSections ?? existing?.homeSections ?? [],
      isPublished: input.isPublished ?? existing?.isPublished ?? false,
    };

    if (input.isPublished === true) {
      assertPublishableProfile(merged);
    }

    const saved = await this.profileRepo.upsert({
      id: existing?.id,
      tenantId: ctx.tenantId!,
      workspaceId: ctx.workspaceId,
      showcaseId: input.showcaseId,
      ...merged,
    });

    return ok(toPortfolioProfileDto(saved));
  }
}
