import type { IntegrationKind } from "@corely/contracts";
import type { IntegrationConnectionEntity } from "../../domain/integration-connection.entity";

export interface IntegrationConnectionRepositoryPort {
  create(connection: IntegrationConnectionEntity): Promise<void>;
  update(connection: IntegrationConnectionEntity): Promise<void>;
  findById(tenantId: string, id: string): Promise<IntegrationConnectionEntity | null>;
  list(
    tenantId: string,
    filter: {
      workspaceId?: string;
      kind?: IntegrationKind;
    }
  ): Promise<IntegrationConnectionEntity[]>;
  findActiveByKind(
    tenantId: string,
    workspaceId: string,
    kind: IntegrationKind
  ): Promise<IntegrationConnectionEntity | null>;
}

export const INTEGRATION_CONNECTION_REPOSITORY_PORT = "integrations/connection-repository";
