import { Inject, Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { ForbiddenError } from "@corely/kernel";
import type { CrmAiSettings } from "@corely/contracts";
import {
  CRM_AI_SETTINGS_REPOSITORY_PORT,
  type CrmAiSettingsRepositoryPort,
} from "../ports/crm-ai-settings-repository.port";

export type CrmAiFeatureState = {
  aiEnabled: boolean;
  v2AnalyticsEnabled: boolean;
  intentSentimentEnabled: boolean;
  settings: CrmAiSettings;
};

@Injectable()
export class CrmAiFeatureGateService {
  constructor(
    private readonly env: EnvService,
    @Inject(CRM_AI_SETTINGS_REPOSITORY_PORT)
    private readonly settingsRepo: CrmAiSettingsRepositoryPort
  ) {}

  async getState(tenantId: string, workspaceId: string): Promise<CrmAiFeatureState> {
    const settings = (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? {
      aiEnabled: true,
      intentSentimentEnabled: false,
    };

    const aiEnabled = this.env.CRM_AI_ENABLED && settings.aiEnabled;
    const v2AnalyticsEnabled = this.env.CRM_AI_V2_ANALYTICS_ENABLED && aiEnabled;
    const intentSentimentEnabled =
      this.env.CRM_AI_INTENT_SENTIMENT_ENABLED && aiEnabled && settings.intentSentimentEnabled;

    return {
      aiEnabled,
      v2AnalyticsEnabled,
      intentSentimentEnabled,
      settings,
    };
  }

  async assertEnabled(tenantId: string, workspaceId: string): Promise<CrmAiFeatureState> {
    const state = await this.getState(tenantId, workspaceId);
    if (!state.aiEnabled) {
      throw new ForbiddenError("CRM AI is disabled for this workspace");
    }
    return state;
  }
}
