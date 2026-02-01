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
import type { PortfolioProfile } from "@corely/contracts";
import {
  PROFILE_REPOSITORY_PORT,
  type ProfileRepositoryPort,
} from "../ports/profile-repository.port";
import { toPortfolioProfileDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class GetProfileUseCase extends BaseUseCase<{ showcaseId: string }, PortfolioProfile> {
  constructor(
    @Inject(PROFILE_REPOSITORY_PORT) private readonly profileRepo: ProfileRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { showcaseId: string },
    ctx: UseCaseContext
  ): Promise<Result<PortfolioProfile, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const profile = await this.profileRepo.findByShowcaseId(
      ctx.tenantId!,
      ctx.workspaceId,
      input.showcaseId
    );
    if (!profile) {
      return err(new NotFoundError("Profile not found"));
    }

    return ok(toPortfolioProfileDto(profile));
  }
}
