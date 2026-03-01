import { Inject, Injectable } from "@nestjs/common";
import {
  AUDIT_PORT,
  BaseUseCase,
  ConflictError,
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
import type { UpdateChannelTemplateInput, UpdateChannelTemplateOutput } from "@corely/contracts";
import { toChannelTemplateDto } from "../../mappers/channel-template-dto.mapper";
import {
  CHANNEL_TEMPLATE_REPOSITORY_PORT,
  type ChannelTemplateRepositoryPort,
} from "../../ports/channel-template-repository.port";

const normalizeSubject = (channel: string, subject?: string | null): string | null => {
  if (channel !== "email") {
    return null;
  }

  const normalized = subject?.trim();
  if (!normalized) {
    throw new ValidationError("subject is required for email templates");
  }

  return normalized;
};

@RequireTenant()
@Injectable()
export class UpdateChannelTemplateUseCase extends BaseUseCase<
  UpdateChannelTemplateInput,
  UpdateChannelTemplateOutput
> {
  constructor(
    @Inject(CHANNEL_TEMPLATE_REPOSITORY_PORT)
    private readonly repository: ChannelTemplateRepositoryPort,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected validate(input: UpdateChannelTemplateInput): UpdateChannelTemplateInput {
    const normalizedName = input.name.trim();
    const normalizedBody = input.body.trim();

    if (!input.templateId?.trim()) {
      throw new ValidationError("templateId is required");
    }

    if (!normalizedName) {
      throw new ValidationError("name is required");
    }

    if (!normalizedBody) {
      throw new ValidationError("body is required");
    }

    return {
      ...input,
      templateId: input.templateId.trim(),
      workspaceId: input.workspaceId.trim(),
      channel: input.channel.trim(),
      name: normalizedName,
      body: normalizedBody,
      subject: input.subject?.trim() ?? null,
    };
  }

  protected async handle(
    input: UpdateChannelTemplateInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateChannelTemplateOutput, UseCaseError>> {
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

    const subject = normalizeSubject(input.channel, input.subject);

    const duplicate = await this.repository.findByName(
      ctx.tenantId,
      input.workspaceId,
      input.channel,
      input.name,
      input.templateId
    );

    if (duplicate) {
      throw new ConflictError("A template with this name already exists for this channel");
    }

    const updated = await this.repository.update({
      tenantId: ctx.tenantId,
      workspaceId: input.workspaceId,
      templateId: input.templateId,
      channel: input.channel,
      name: input.name,
      subject,
      body: input.body,
      updatedByUserId: ctx.userId ?? null,
    });

    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "crm.channel-template.update",
      entityType: "crm.channel-template",
      entityId: updated.id,
      metadata: {
        workspaceId: updated.workspaceId,
        channel: updated.channel,
      },
    });

    return ok({ template: toChannelTemplateDto(updated) });
  }
}
