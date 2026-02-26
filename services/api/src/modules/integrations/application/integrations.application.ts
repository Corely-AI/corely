import type { CreateIntegrationConnectionUseCase } from "./use-cases/create-integration-connection.usecase";
import type { ListIntegrationConnectionsUseCase } from "./use-cases/list-integration-connections.usecase";
import type { UpdateIntegrationConnectionUseCase } from "./use-cases/update-integration-connection.usecase";
import type { TestIntegrationConnectionUseCase } from "./use-cases/test-integration-connection.usecase";

export class IntegrationsApplication {
  constructor(
    public readonly createConnection: CreateIntegrationConnectionUseCase,
    public readonly listConnections: ListIntegrationConnectionsUseCase,
    public readonly updateConnection: UpdateIntegrationConnectionUseCase,
    public readonly testConnection: TestIntegrationConnectionUseCase
  ) {}
}
