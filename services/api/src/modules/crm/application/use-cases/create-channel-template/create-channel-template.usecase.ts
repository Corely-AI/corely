import { Inject, Injectable } from "@nestjs/common";
import {
  AUDIT_PORT,
  BaseUseCase,
  ConflictError,
  NoopLogger,
  RequireTenant,
  type AuditPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
} from "@corely/kernel";
import type { CreateChannelTemplateInput, CreateChannelTemplateOutput } from "@corely/contracts";
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
export class CreateChannelTemplateUseCase extends BaseUseCase<
  CreateChannelTemplateInput,
  CreateChannelTemplateOutput
> {
  constructor(
    @Inject(CHANNEL_TEMPLATE_REPOSITORY_PORT)
    private readonly repository: ChannelTemplateRepositoryPort,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected validate(input: CreateChannelTemplateInput): CreateChannelTemplateInput {
    const normalizedName = input.name.trim();
    const normalizedBody = input.body.trim();

    if (!normalizedName) {
      throw new ValidationError("name is required");
    }

    if (!normalizedBody) {
      throw new ValidationError("body is required");
    }

    return {
      ...input,
      workspaceId: input.workspaceId.trim(),
      channel: input.channel.trim(),
      name: normalizedName,
      body: normalizedBody,
      subject: input.subject?.trim() ?? null,
    };
  }

  protected async handle(
    input: CreateChannelTemplateInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateChannelTemplateOutput, UseCaseError>> {
    if (ctx.workspaceId && ctx.workspaceId !== input.workspaceId) {
      throw new ValidationError("workspaceId must match active workspace context");
    }

    const subject = normalizeSubject(input.channel, input.subject);

    const existing = await this.repository.findByName(
      ctx.tenantId,
      input.workspaceId,
      input.channel,
      input.name
    );

    if (existing) {
      throw new ConflictError("A template with this name already exists for this channel");
    }

    const created = await this.repository.create({
      tenantId: ctx.tenantId,
      workspaceId: input.workspaceId,
      channel: input.channel,
      name: input.name,
      subject,
      body: input.body,
      createdByUserId: ctx.userId ?? null,
      updatedByUserId: ctx.userId ?? null,
    });

    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "crm.channel-template.create",
      entityType: "crm.channel-template",
      entityId: created.id,
      metadata: {
        workspaceId: created.workspaceId,
        channel: created.channel,
      },
    });

    return ok({ template: toChannelTemplateDto(created) });
  }
}
