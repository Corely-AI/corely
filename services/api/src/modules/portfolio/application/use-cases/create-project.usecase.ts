import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ConflictError,
  ValidationError,
  NotFoundError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { CreatePortfolioProjectInput, PortfolioProject } from "@corely/contracts";
import {
  assertPublishableProject,
  assertValidSlug,
  shouldPublish,
} from "../../domain/portfolio-rules";
import type { PortfolioProject as PortfolioProjectEntity } from "../../domain/portfolio.types";
import {
  PROJECT_REPOSITORY_PORT,
  type ProjectRepositoryPort,
} from "../ports/project-repository.port";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioProjectDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type CreateProjectParams = CreatePortfolioProjectInput & { showcaseId: string };

@RequireTenant()
@Injectable()
export class CreateProjectUseCase extends BaseUseCase<CreateProjectParams, PortfolioProject> {
  constructor(
    @Inject(PROJECT_REPOSITORY_PORT) private readonly repo: ProjectRepositoryPort,
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CreateProjectParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioProject, UseCaseError>> {
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

    const slug = input.slug.trim();
    assertValidSlug(slug);

    const existing = await this.repo.findBySlug(input.showcaseId, slug);
    if (existing) {
      return err(new ConflictError("Project slug already exists"));
    }

    const status = input.status ?? "draft";
    if (shouldPublish(status)) {
      const merged: Partial<PortfolioProjectEntity> = {
        title: input.title,
        summary: input.summary,
        content: input.content,
      };
      assertPublishableProject(merged);
    }

    const created = await this.repo.create({
      tenantId: ctx.tenantId!,
      workspaceId: ctx.workspaceId,
      showcaseId: input.showcaseId,
      title: input.title.trim(),
      slug,
      summary: input.summary.trim(),
      content: input.content,
      type: input.type,
      status,
      featured: input.featured ?? false,
      sortOrder: input.sortOrder ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      links: input.links ?? null,
      techStack: input.techStack ?? [],
      metrics: input.metrics ?? null,
    });

    return ok(toPortfolioProjectDto(created));
  }
}
