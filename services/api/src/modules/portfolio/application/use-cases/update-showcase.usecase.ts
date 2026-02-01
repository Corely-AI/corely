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
import type { UpdatePortfolioShowcaseInput, PortfolioShowcase } from "@corely/contracts";
import { assertValidSlug } from "../../domain/portfolio-rules";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioShowcaseDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type UpdateShowcaseParams = UpdatePortfolioShowcaseInput & { showcaseId: string };

@RequireTenant()
@Injectable()
export class UpdateShowcaseUseCase extends BaseUseCase<UpdateShowcaseParams, PortfolioShowcase> {
  constructor(@Inject(SHOWCASE_REPOSITORY_PORT) private readonly repo: ShowcaseRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: UpdateShowcaseParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioShowcase, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.showcaseId);
    if (!existing) {
      return err(new NotFoundError("Showcase not found"));
    }

    const nextSlug = input.slug?.trim();
    if (nextSlug && nextSlug !== existing.slug) {
      assertValidSlug(nextSlug);
      const conflict = await this.repo.findBySlug(ctx.tenantId!, ctx.workspaceId, nextSlug);
      if (conflict && conflict.id !== existing.id) {
        return err(new ConflictError("Showcase slug already exists"));
      }
    }

    const updated = await this.repo.update(ctx.tenantId!, ctx.workspaceId, existing.id, {
      type: input.type,
      name: input.name?.trim(),
      slug: nextSlug,
      primaryDomain: input.primaryDomain ?? undefined,
      isPublished: input.isPublished,
    });

    return ok(toPortfolioShowcaseDto(updated));
  }
}
