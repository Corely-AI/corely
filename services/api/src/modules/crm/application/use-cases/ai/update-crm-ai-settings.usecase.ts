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
import type { UpdateCrmAiSettingsInput, UpdateCrmAiSettingsOutput } from "@corely/contracts";
import {
  CRM_AI_SETTINGS_REPOSITORY_PORT,
  type CrmAiSettingsRepositoryPort,
} from "../../ports/crm-ai-settings-repository.port";
import { resolveWorkspaceId } from "./crm-ai.shared";

@RequireTenant()
@Injectable()
export class UpdateCrmAiSettingsUseCase extends BaseUseCase<
  UpdateCrmAiSettingsInput,
  UpdateCrmAiSettingsOutput
> {
  constructor(
    @Inject(CRM_AI_SETTINGS_REPOSITORY_PORT)
    private readonly settingsRepo: CrmAiSettingsRepositoryPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected async handle(
    input: UpdateCrmAiSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateCrmAiSettingsOutput, UseCaseError>> {
    const workspaceId = resolveWorkspaceId(ctx.tenantId, ctx.workspaceId);
    const current = (await this.settingsRepo.getSettings(ctx.tenantId, workspaceId)) ?? {
      aiEnabled: true,
      intentSentimentEnabled: false,
    };
    const next = {
      aiEnabled: input.aiEnabled ?? current.aiEnabled,
      intentSentimentEnabled: input.intentSentimentEnabled ?? current.intentSentimentEnabled,
    };
    await this.settingsRepo.saveSettings(ctx.tenantId, workspaceId, next);
    return ok({ settings: next });
  }
}
