import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  RequireTenant,
  ValidationError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type {
  CreateIntegrationConnectionInput,
  CreateIntegrationConnectionOutput,
} from "@corely/contracts";
import { IntegrationConnectionEntity } from "../../domain/integration-connection.entity";
import {
  INTEGRATION_CONNECTION_REPOSITORY_PORT,
  type IntegrationConnectionRepositoryPort,
} from "../ports/integration-connection-repository.port";
import { IntegrationSecretsService } from "../../infrastructure/secrets/integration-secrets.service";

@RequireTenant()
@Injectable()
export class CreateIntegrationConnectionUseCase extends BaseUseCase<
  CreateIntegrationConnectionInput,
  CreateIntegrationConnectionOutput
> {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY_PORT)
    private readonly repository: IntegrationConnectionRepositoryPort,
    private readonly secrets: IntegrationSecretsService
  ) {
    super({ logger: new NoopLogger() });
  }

  protected validate(input: CreateIntegrationConnectionInput): CreateIntegrationConnectionInput {
    if (!input.workspaceId) {
      throw new ValidationError("workspaceId is required");
    }
    return input;
  }

  protected async handle(
    input: CreateIntegrationConnectionInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateIntegrationConnectionOutput, UseCaseError>> {
    const connection = new IntegrationConnectionEntity({
      id: randomUUID(),
      tenantId: ctx.tenantId!,
      workspaceId: input.workspaceId,
      kind: input.kind,
      authMethod: input.authMethod,
      status: "active",
      displayName: input.displayName ?? null,
      config: input.config,
      secretEncrypted: input.secret ? this.secrets.encrypt(input.secret) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repository.create(connection);

    return ok({
      connection: connection.toDto(),
    });
  }
}
