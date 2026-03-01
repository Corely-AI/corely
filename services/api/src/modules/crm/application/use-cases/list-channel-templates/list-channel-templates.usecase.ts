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
import type {
  ListChannelTemplatesOutput,
  ListChannelTemplatesQuery,
  SystemChannelTemplateDto,
} from "@corely/contracts";
import { toChannelTemplateDto } from "../../mappers/channel-template-dto.mapper";
import {
  CHANNEL_TEMPLATE_REPOSITORY_PORT,
  type ChannelTemplateRepositoryPort,
} from "../../ports/channel-template-repository.port";
import { ChannelCatalogService } from "../../channel-catalog.service";

const filterSystemTemplates = (
  templates: SystemChannelTemplateDto[],
  params: { channel?: string; q?: string }
): SystemChannelTemplateDto[] => {
  const q = params.q?.trim().toLowerCase();

  return templates.filter((template) => {
    if (params.channel && template.channel !== params.channel) {
      return false;
    }

    if (q && !template.name.toLowerCase().includes(q)) {
      return false;
    }

    return true;
  });
};

@RequireTenant()
@Injectable()
export class ListChannelTemplatesUseCase extends BaseUseCase<
  ListChannelTemplatesQuery,
  ListChannelTemplatesOutput
> {
  constructor(
    @Inject(CHANNEL_TEMPLATE_REPOSITORY_PORT)
    private readonly repository: ChannelTemplateRepositoryPort,
    private readonly channelCatalog: ChannelCatalogService
  ) {
    super({ logger: new NoopLogger() });
  }

  protected validate(input: ListChannelTemplatesQuery): ListChannelTemplatesQuery {
    if (!input.workspaceId?.trim()) {
      throw new ValidationError("workspaceId is required");
    }

    return {
      ...input,
      workspaceId: input.workspaceId.trim(),
      channel: input.channel?.trim(),
      q: input.q?.trim(),
    };
  }

  protected async handle(
    input: ListChannelTemplatesQuery,
    ctx: UseCaseContext
  ): Promise<Result<ListChannelTemplatesOutput, UseCaseError>> {
    if (ctx.workspaceId && ctx.workspaceId !== input.workspaceId) {
      throw new ValidationError("workspaceId must match active workspace context");
    }

    const workspaceTemplates = await this.repository.listByWorkspace(
      ctx.tenantId,
      input.workspaceId,
      {
        channel: input.channel,
        q: input.q,
      }
    );

    const systemTemplates = filterSystemTemplates(await this.channelCatalog.listSystemTemplates(), {
      channel: input.channel,
      q: input.q,
    });

    return ok({
      workspaceTemplates: workspaceTemplates.map(toChannelTemplateDto),
      systemTemplates,
      defaultTemplateId: null,
    });
  }
}
