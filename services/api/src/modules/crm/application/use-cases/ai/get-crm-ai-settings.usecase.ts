import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import { EnvService } from "@corely/config";
import type { GetCrmAiSettingsOutput } from "@corely/contracts";
import {
  CRM_AI_SETTINGS_REPOSITORY_PORT,
  type CrmAiSettingsRepositoryPort,
} from "../../ports/crm-ai-settings-repository.port";
import { resolveWorkspaceId } from "./crm-ai.shared";

@RequireTenant()
@Injectable()
export class GetCrmAiSettingsUseCase extends BaseUseCase<void, GetCrmAiSettingsOutput> {
  constructor(
    @Inject(CRM_AI_SETTINGS_REPOSITORY_PORT)
    private readonly settingsRepo: CrmAiSettingsRepositoryPort,
    private readonly env: EnvService,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<GetCrmAiSettingsOutput, UseCaseError>> {
    const workspaceId = resolveWorkspaceId(ctx.tenantId, ctx.workspaceId);
    const settings = (await this.settingsRepo.getSettings(ctx.tenantId, workspaceId)) ?? {
      aiEnabled: true,
      intentSentimentEnabled: false,
    };
    return ok({
      settings: {
        aiEnabled: this.env.CRM_AI_ENABLED && settings.aiEnabled,
        intentSentimentEnabled:
          this.env.CRM_AI_ENABLED &&
          this.env.CRM_AI_INTENT_SENTIMENT_ENABLED &&
          settings.intentSentimentEnabled,
      },
    });
  }
}
