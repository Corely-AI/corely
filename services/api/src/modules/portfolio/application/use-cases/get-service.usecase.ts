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
import type { GetPortfolioServiceOutput } from "@corely/contracts";
import {
  SERVICE_REPOSITORY_PORT,
  type ServiceRepositoryPort,
} from "../ports/service-repository.port";
import { toPortfolioServiceDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class GetServiceUseCase extends BaseUseCase<{ serviceId: string }, GetPortfolioServiceOutput> {
  constructor(@Inject(SERVICE_REPOSITORY_PORT) private readonly repo: ServiceRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { serviceId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetPortfolioServiceOutput, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const service = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.serviceId);
    if (!service) {
      return err(new NotFoundError("Service not found"));
    }

    return ok({ service: toPortfolioServiceDto(service) });
  }
}
