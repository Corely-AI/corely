import { Inject, Injectable } from "@nestjs/common";
import {
  AUDIT_PORT,
  BaseUseCase,
  NoopLogger,
  NotFoundError,
  RequireTenant,
  type AuditPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
} from "@corely/kernel";
import type { DeleteChannelTemplateInput, DeleteChannelTemplateOutput } from "@corely/contracts";
import {
  CHANNEL_TEMPLATE_REPOSITORY_PORT,
  type ChannelTemplateRepositoryPort,
} from "../../ports/channel-template-repository.port";

@RequireTenant()
@Injectable()
export class DeleteChannelTemplateUseCase extends BaseUseCase<
  DeleteChannelTemplateInput,
  DeleteChannelTemplateOutput
> {
  constructor(
    @Inject(CHANNEL_TEMPLATE_REPOSITORY_PORT)
    private readonly repository: ChannelTemplateRepositoryPort,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected validate(input: DeleteChannelTemplateInput): DeleteChannelTemplateInput {
    if (!input.templateId?.trim()) {
      throw new ValidationError("templateId is required");
    }

    if (!input.workspaceId?.trim()) {
      throw new ValidationError("workspaceId is required");
    }

    return {
      templateId: input.templateId.trim(),
      workspaceId: input.workspaceId.trim(),
    };
  }

  protected async handle(
    input: DeleteChannelTemplateInput,
    ctx: UseCaseContext
  ): Promise<Result<DeleteChannelTemplateOutput, UseCaseError>> {
    if (ctx.workspaceId && ctx.workspaceId !== input.workspaceId) {
      throw new ValidationError("workspaceId must match active workspace context");
    }

    const existing = await this.repository.findById(
      ctx.tenantId,
      input.workspaceId,
      input.templateId
    );
    if (!existing) {
      throw new NotFoundError("Channel template not found");
    }

    await this.repository.delete(ctx.tenantId, input.workspaceId, input.templateId);

    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "crm.channel-template.delete",
      entityType: "crm.channel-template",
      entityId: input.templateId,
      metadata: {
        workspaceId: input.workspaceId,
        channel: existing.channel,
      },
    });

    return ok({ deleted: true });
  }
}
