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
import type { CreatePortfolioClientInput, PortfolioClient } from "@corely/contracts";
import { assertValidSlug } from "../../domain/portfolio-rules";
import { CLIENT_REPOSITORY_PORT, type ClientRepositoryPort } from "../ports/client-repository.port";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioClientDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type CreateClientParams = CreatePortfolioClientInput & { showcaseId: string };

@RequireTenant()
@Injectable()
export class CreateClientUseCase extends BaseUseCase<CreateClientParams, PortfolioClient> {
  constructor(
    @Inject(CLIENT_REPOSITORY_PORT) private readonly repo: ClientRepositoryPort,
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CreateClientParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioClient, UseCaseError>> {
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
      return err(new ConflictError("Client slug already exists"));
    }

    const created = await this.repo.create({
      tenantId: ctx.tenantId!,
      workspaceId: ctx.workspaceId,
      showcaseId: input.showcaseId,
      name: input.name.trim(),
      slug,
      clientType: input.clientType,
      locationText: input.locationText,
      websiteUrl: input.websiteUrl ?? null,
      logoImageUrl: input.logoImageUrl ?? null,
      summary: input.summary ?? null,
      testimonialQuote: input.testimonialQuote ?? null,
      testimonialAuthor: input.testimonialAuthor ?? null,
      featured: input.featured ?? false,
      sortOrder: input.sortOrder ?? null,
    });

    return ok(toPortfolioClientDto(created));
  }
}
