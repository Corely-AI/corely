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
import type { PublicPortfolioClientsOutput } from "@corely/contracts";
import { assertPublicModuleEnabled } from "../../../../shared/public";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { CLIENT_REPOSITORY_PORT, type ClientRepositoryPort } from "../ports/client-repository.port";
import { toPortfolioClientDto } from "../mappers/portfolio.mapper";

@RequireTenant()
@Injectable()
export class ListPublicClientsUseCase extends BaseUseCase<
  { slug: string },
  PublicPortfolioClientsOutput
> {
  constructor(
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort,
    @Inject(CLIENT_REPOSITORY_PORT) private readonly clientRepo: ClientRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { slug: string },
    ctx: UseCaseContext
  ): Promise<Result<PublicPortfolioClientsOutput, UseCaseError>> {
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

    const result = await this.clientRepo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id,
      { featured: true, featuredOnly: true },
      { page: 1, pageSize: 200 }
    );

    return ok({ items: result.items.map(toPortfolioClientDto) });
  }
}
