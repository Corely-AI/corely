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
import type { PublicPortfolioServicesOutput } from "@corely/contracts";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import {
  SERVICE_REPOSITORY_PORT,
  type ServiceRepositoryPort,
} from "../ports/service-repository.port";
import { toPortfolioServiceDto } from "../mappers/portfolio.mapper";

@RequireTenant()
@Injectable()
export class ListPublicServicesUseCase extends BaseUseCase<
  { slug: string },
  PublicPortfolioServicesOutput
> {
  constructor(
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort,
    @Inject(SERVICE_REPOSITORY_PORT) private readonly serviceRepo: ServiceRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { slug: string },
    ctx: UseCaseContext
  ): Promise<Result<PublicPortfolioServicesOutput, UseCaseError>> {
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

    const result = await this.serviceRepo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id,
      { status: "published", publishedOnly: true },
      { page: 1, pageSize: 200 }
    );

    return ok({ items: result.items.map(toPortfolioServiceDto) });
  }
}
