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
import type { CreatePortfolioServiceInput, PortfolioService } from "@corely/contracts";
import {
  assertCompanyMode,
  assertPublishableService,
  assertValidSlug,
  shouldPublish,
} from "../../domain/portfolio-rules";
import {
  SERVICE_REPOSITORY_PORT,
  type ServiceRepositoryPort,
} from "../ports/service-repository.port";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioServiceDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";
import type { PortfolioService as PortfolioServiceEntity } from "../../domain/portfolio.types";

type CreateServiceParams = CreatePortfolioServiceInput & { showcaseId: string };

@RequireTenant()
@Injectable()
export class CreateServiceUseCase extends BaseUseCase<CreateServiceParams, PortfolioService> {
  constructor(
    @Inject(SERVICE_REPOSITORY_PORT) private readonly repo: ServiceRepositoryPort,
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CreateServiceParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioService, UseCaseError>> {
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

    assertCompanyMode(showcase.type);

    const slug = input.slug.trim();
    assertValidSlug(slug);

    const existing = await this.repo.findBySlug(input.showcaseId, slug);
    if (existing) {
      return err(new ConflictError("Service slug already exists"));
    }

    const status = input.status ?? "draft";
    if (shouldPublish(status)) {
      const merged: Partial<PortfolioServiceEntity> = {
        name: input.name,
        shortDescription: input.shortDescription,
      };
      assertPublishableService(merged);
    }

    const created = await this.repo.create({
      tenantId: ctx.tenantId!,
      workspaceId: ctx.workspaceId,
      showcaseId: input.showcaseId,
      name: input.name.trim(),
      slug,
      shortDescription: input.shortDescription,
      deliverables: input.deliverables ?? [],
      startingFromPrice: input.startingFromPrice ?? null,
      ctaText: input.ctaText ?? null,
      ctaUrl: input.ctaUrl ?? null,
      status,
      sortOrder: input.sortOrder ?? null,
    });

    return ok(toPortfolioServiceDto(created));
  }
}
