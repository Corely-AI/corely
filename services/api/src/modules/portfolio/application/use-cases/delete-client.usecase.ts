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
  CLIENT_REPOSITORY_PORT,
  type ClientRepositoryPort,
} from "../ports/client-repository.port";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class DeleteClientUseCase extends BaseUseCase<{ clientId: string }, { deleted: true }> {
  constructor(@Inject(CLIENT_REPOSITORY_PORT) private readonly repo: ClientRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { clientId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ deleted: true }, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.clientId);
    if (!existing) {
      return err(new NotFoundError("Client not found"));
    }

    await this.repo.delete(ctx.tenantId!, ctx.workspaceId, input.clientId);
    return ok({ deleted: true });
  }
}
