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
import type { PublicPortfolioProjectOutput } from "@corely/contracts";
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
export class GetPublicProjectUseCase extends BaseUseCase<
  { slug: string; projectSlug: string },
  PublicPortfolioProjectOutput
> {
  constructor(
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort,
    @Inject(PROJECT_REPOSITORY_PORT) private readonly projectRepo: ProjectRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { slug: string; projectSlug: string },
    ctx: UseCaseContext
  ): Promise<Result<PublicPortfolioProjectOutput, UseCaseError>> {
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

    const project = await this.projectRepo.findBySlug(showcase.id, input.projectSlug, {
      publishedOnly: true,
    });
    if (!project || project.status !== "published") {
      return err(new NotFoundError("Project not found"));
    }

    return ok({ project: toPortfolioProjectDto(project) });
  }
}
