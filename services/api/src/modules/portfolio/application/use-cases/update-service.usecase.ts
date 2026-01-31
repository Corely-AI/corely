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
import type { UpdatePortfolioServiceInput, PortfolioService } from "@corely/contracts";
import type { PortfolioService as PortfolioServiceEntity } from "../../domain/portfolio.types";
import {
  assertPublishableService,
  assertValidSlug,
  shouldPublish,
} from "../../domain/portfolio-rules";
import {
  SERVICE_REPOSITORY_PORT,
  type ServiceRepositoryPort,
} from "../ports/service-repository.port";
import { toPortfolioServiceDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type UpdateServiceParams = UpdatePortfolioServiceInput & { serviceId: string };

@RequireTenant()
@Injectable()
export class UpdateServiceUseCase extends BaseUseCase<UpdateServiceParams, PortfolioService> {
  constructor(@Inject(SERVICE_REPOSITORY_PORT) private readonly repo: ServiceRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: UpdateServiceParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioService, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.serviceId);
    if (!existing) {
      return err(new NotFoundError("Service not found"));
    }

    const nextSlug = input.slug?.trim();
    if (nextSlug && nextSlug !== existing.slug) {
      assertValidSlug(nextSlug);
      const conflict = await this.repo.findBySlug(existing.showcaseId, nextSlug);
      if (conflict && conflict.id !== existing.id) {
        return err(new ConflictError("Service slug already exists"));
      }
    }

    const nextStatus = input.status ?? existing.status;
    if (shouldPublish(nextStatus)) {
      const merged: Partial<PortfolioServiceEntity> = {
        name: input.name ?? existing.name,
        shortDescription: input.shortDescription ?? existing.shortDescription,
      };
      assertPublishableService(merged);
    }

    const updated = await this.repo.update(ctx.tenantId!, ctx.workspaceId, existing.id, {
      name: input.name?.trim(),
      slug: nextSlug,
      shortDescription: input.shortDescription,
      deliverables: input.deliverables ?? undefined,
      startingFromPrice: input.startingFromPrice ?? undefined,
      ctaText: input.ctaText ?? undefined,
      ctaUrl: input.ctaUrl ?? undefined,
      status: input.status,
      sortOrder: input.sortOrder ?? undefined,
    });

    return ok(toPortfolioServiceDto(updated));
  }
}
