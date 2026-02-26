import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
} from "@corely/kernel";
import type { CreateCrmMailboxInput, CreateCrmMailboxOutput } from "@corely/contracts";
import { IntegrationConnectionResolverService } from "../../../integrations";
import {
  CRM_MAILBOX_REPOSITORY_PORT,
  type CrmMailboxRepositoryPort,
} from "../ports/crm-mailbox-repository.port";

@RequireTenant()
@Injectable()
export class CreateCrmMailboxUseCase extends BaseUseCase<
  CreateCrmMailboxInput,
  CreateCrmMailboxOutput
> {
  constructor(
    @Inject(CRM_MAILBOX_REPOSITORY_PORT)
    private readonly repository: CrmMailboxRepositoryPort,
    private readonly resolver: IntegrationConnectionResolverService
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CreateCrmMailboxInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCrmMailboxOutput, UseCaseError>> {
    if (!input.workspaceId) {
      throw new ValidationError("workspaceId is required");
    }

    const resolved = await this.resolver.resolveById(ctx.tenantId!, input.integrationConnectionId);

    const mailbox = await this.repository.createMailbox({
      tenantId: ctx.tenantId!,
      workspaceId: input.workspaceId,
      integrationConnectionId: input.integrationConnectionId,
      providerKind: resolved.connection.toObject().kind,
      address: input.address,
      displayName: input.displayName,
    });

    return ok({ mailbox });
  }
}
