import type { CrmAiSettings } from "@corely/contracts";

export interface CrmAiSettingsRepositoryPort {
  getSettings(tenantId: string, workspaceId: string): Promise<CrmAiSettings | null>;
  saveSettings(tenantId: string, workspaceId: string, settings: CrmAiSettings): Promise<void>;
}

export const CRM_AI_SETTINGS_REPOSITORY_PORT = "crm/ai-settings-repository";
