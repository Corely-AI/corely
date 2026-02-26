import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type {
  ListIntegrationConnectionsInput,
  ListIntegrationConnectionsOutput,
} from "@corely/contracts";
import {
  INTEGRATION_CONNECTION_REPOSITORY_PORT,
  type IntegrationConnectionRepositoryPort,
} from "../ports/integration-connection-repository.port";

@RequireTenant()
@Injectable()
export class ListIntegrationConnectionsUseCase extends BaseUseCase<
  ListIntegrationConnectionsInput,
  ListIntegrationConnectionsOutput
> {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY_PORT)
    private readonly repository: IntegrationConnectionRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: ListIntegrationConnectionsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListIntegrationConnectionsOutput, UseCaseError>> {
    const rows = await this.repository.list(ctx.tenantId!, {
      workspaceId: input.workspaceId,
      kind: input.kind,
    });

    return ok({
      items: rows.map((row) => row.toDto()),
    });
  }
}
