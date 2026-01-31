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
import type { GetPortfolioClientOutput } from "@corely/contracts";
import {
  CLIENT_REPOSITORY_PORT,
  type ClientRepositoryPort,
} from "../ports/client-repository.port";
import { toPortfolioClientDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class GetClientUseCase extends BaseUseCase<{ clientId: string }, GetPortfolioClientOutput> {
  constructor(@Inject(CLIENT_REPOSITORY_PORT) private readonly repo: ClientRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { clientId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetPortfolioClientOutput, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const client = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.clientId);
    if (!client) {
      return err(new NotFoundError("Client not found"));
    }

    return ok({ client: toPortfolioClientDto(client) });
  }
}
