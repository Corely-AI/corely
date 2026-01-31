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
import {
  SERVICE_REPOSITORY_PORT,
  type ServiceRepositoryPort,
} from "../ports/service-repository.port";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class DeleteServiceUseCase extends BaseUseCase<{ serviceId: string }, { deleted: true }> {
  constructor(@Inject(SERVICE_REPOSITORY_PORT) private readonly repo: ServiceRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { serviceId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ deleted: true }, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.serviceId);
    if (!existing) {
      return err(new NotFoundError("Service not found"));
    }

    await this.repo.delete(ctx.tenantId!, ctx.workspaceId, input.serviceId);
    return ok({ deleted: true });
  }
}
