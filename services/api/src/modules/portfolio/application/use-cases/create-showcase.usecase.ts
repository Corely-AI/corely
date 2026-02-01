import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  ConflictError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { CreatePortfolioShowcaseInput, PortfolioShowcase } from "@corely/contracts";
import { assertValidSlug } from "../../domain/portfolio-rules";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioShowcaseDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class CreateShowcaseUseCase extends BaseUseCase<
  CreatePortfolioShowcaseInput,
  PortfolioShowcase
> {
  constructor(
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly repo: ShowcaseRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CreatePortfolioShowcaseInput,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioShowcase, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const slug = input.slug.trim();
    assertValidSlug(slug);

    const existing = await this.repo.findBySlug(ctx.tenantId!, ctx.workspaceId, slug);
    if (existing) {
      return err(new ConflictError("Showcase slug already exists"));
    }

    const created = await this.repo.create({
      tenantId: ctx.tenantId!,
      workspaceId: ctx.workspaceId,
      type: input.type,
      name: input.name.trim(),
      slug,
      primaryDomain: input.primaryDomain ?? null,
      isPublished: input.isPublished ?? false,
    });

    return ok(toPortfolioShowcaseDto(created));
  }
}
