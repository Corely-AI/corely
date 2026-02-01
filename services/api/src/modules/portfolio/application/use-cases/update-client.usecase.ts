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
import type { UpdatePortfolioClientInput, PortfolioClient } from "@corely/contracts";
import { assertValidSlug } from "../../domain/portfolio-rules";
import {
  CLIENT_REPOSITORY_PORT,
  type ClientRepositoryPort,
} from "../ports/client-repository.port";
import { toPortfolioClientDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type UpdateClientParams = UpdatePortfolioClientInput & { clientId: string };

@RequireTenant()
@Injectable()
export class UpdateClientUseCase extends BaseUseCase<UpdateClientParams, PortfolioClient> {
  constructor(@Inject(CLIENT_REPOSITORY_PORT) private readonly repo: ClientRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: UpdateClientParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioClient, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.clientId);
    if (!existing) {
      return err(new NotFoundError("Client not found"));
    }

    const nextSlug = input.slug?.trim();
    if (nextSlug && nextSlug !== existing.slug) {
      assertValidSlug(nextSlug);
      const conflict = await this.repo.findBySlug(existing.showcaseId, nextSlug);
      if (conflict && conflict.id !== existing.id) {
        return err(new ConflictError("Client slug already exists"));
      }
    }

    const updated = await this.repo.update(ctx.tenantId!, ctx.workspaceId, existing.id, {
      name: input.name?.trim(),
      slug: nextSlug,
      clientType: input.clientType,
      locationText: input.locationText,
      websiteUrl: input.websiteUrl ?? undefined,
      logoImageUrl: input.logoImageUrl ?? undefined,
      summary: input.summary ?? undefined,
      testimonialQuote: input.testimonialQuote ?? undefined,
      testimonialAuthor: input.testimonialAuthor ?? undefined,
      featured: input.featured,
      sortOrder: input.sortOrder ?? undefined,
    });

    return ok(toPortfolioClientDto(updated));
  }
}
