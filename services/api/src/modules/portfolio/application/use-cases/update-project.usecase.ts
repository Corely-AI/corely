import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ConflictError,
  NotFoundError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { UpdatePortfolioProjectInput, PortfolioProject } from "@corely/contracts";
import type { PortfolioProject as PortfolioProjectEntity } from "../../domain/portfolio.types";
import {
  assertPublishableProject,
  assertValidSlug,
  shouldPublish,
} from "../../domain/portfolio-rules";
import {
  PROJECT_REPOSITORY_PORT,
  type ProjectRepositoryPort,
} from "../ports/project-repository.port";
import { toPortfolioProjectDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type UpdateProjectParams = UpdatePortfolioProjectInput & { projectId: string };

@RequireTenant()
@Injectable()
export class UpdateProjectUseCase extends BaseUseCase<UpdateProjectParams, PortfolioProject> {
  constructor(@Inject(PROJECT_REPOSITORY_PORT) private readonly repo: ProjectRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: UpdateProjectParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioProject, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.projectId);
    if (!existing) {
      return err(new NotFoundError("Project not found"));
    }

    const nextSlug = input.slug?.trim();
    if (nextSlug && nextSlug !== existing.slug) {
      assertValidSlug(nextSlug);
      const conflict = await this.repo.findBySlug(existing.showcaseId, nextSlug);
      if (conflict && conflict.id !== existing.id) {
        return err(new ConflictError("Project slug already exists"));
      }
    }

    const nextStatus = input.status ?? existing.status;
    if (shouldPublish(nextStatus)) {
      const merged: Partial<PortfolioProjectEntity> = {
        title: input.title ?? existing.title,
        summary: input.summary ?? existing.summary,
        content: input.content ?? existing.content,
      };
      assertPublishableProject(merged);
    }

    const updated = await this.repo.update(ctx.tenantId!, ctx.workspaceId, existing.id, {
      title: input.title?.trim(),
      slug: nextSlug,
      summary: input.summary?.trim(),
      content: input.content,
      type: input.type,
      status: input.status,
      featured: input.featured,
      sortOrder: input.sortOrder ?? undefined,
      coverImageUrl: input.coverImageUrl ?? undefined,
      links: input.links ?? undefined,
      techStack: input.techStack ?? undefined,
      metrics: input.metrics ?? undefined,
    });

    return ok(toPortfolioProjectDto(updated));
  }
}
