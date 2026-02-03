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
import type { PublicPortfolioTeamMembersOutput } from "@corely/contracts";
import { assertPublicModuleEnabled } from "../../../../shared/public";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { TEAM_REPOSITORY_PORT, type TeamRepositoryPort } from "../ports/team-repository.port";
import { toPortfolioTeamMemberDto } from "../mappers/portfolio.mapper";

@RequireTenant()
@Injectable()
export class ListPublicTeamUseCase extends BaseUseCase<
  { slug: string },
  PublicPortfolioTeamMembersOutput
> {
  constructor(
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort,
    @Inject(TEAM_REPOSITORY_PORT) private readonly teamRepo: TeamRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { slug: string },
    ctx: UseCaseContext
  ): Promise<Result<PublicPortfolioTeamMembersOutput, UseCaseError>> {
    const publishError = assertPublicModuleEnabled(ctx, "portfolio");
    if (publishError) {
      return err(publishError);
    }

    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const showcase = await this.showcaseRepo.findBySlug(input.slug, {
      tenantId: ctx.tenantId!,
      workspaceId: ctx.workspaceId,
      publishedOnly: true,
    });
    if (!showcase || !showcase.isPublished) {
      return err(new NotFoundError("Showcase not found"));
    }

    const result = await this.teamRepo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id,
      { status: "published", publishedOnly: true },
      { page: 1, pageSize: 200 }
    );

    return ok({ items: result.items.map(toPortfolioTeamMemberDto) });
  }
}
