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
import type { PublicPortfolioProjectsOutput } from "@corely/contracts";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import {
  PROJECT_REPOSITORY_PORT,
  type ProjectRepositoryPort,
} from "../ports/project-repository.port";
import { toPortfolioProjectDto } from "../mappers/portfolio.mapper";

@RequireTenant()
@Injectable()
export class ListPublicProjectsUseCase extends BaseUseCase<
  { slug: string },
  PublicPortfolioProjectsOutput
> {
  constructor(
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort,
    @Inject(PROJECT_REPOSITORY_PORT) private readonly projectRepo: ProjectRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { slug: string },
    ctx: UseCaseContext
  ): Promise<Result<PublicPortfolioProjectsOutput, UseCaseError>> {
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const showcase = await this.showcaseRepo.findBySlug(
      ctx.tenantId!,
      ctx.workspaceId,
      input.slug,
      { publishedOnly: true }
    );
    if (!showcase || !showcase.isPublished) {
      return err(new NotFoundError("Showcase not found"));
    }

    const result = await this.projectRepo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id,
      { status: "published", publishedOnly: true },
      { page: 1, pageSize: 200 }
    );

    return ok({ items: result.items.map(toPortfolioProjectDto) });
  }
}
