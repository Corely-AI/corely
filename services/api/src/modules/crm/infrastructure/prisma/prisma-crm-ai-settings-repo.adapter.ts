import { Inject, Injectable } from "@nestjs/common";
import { EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import { CrmAiSettingsSchema, type CrmAiSettings } from "@corely/contracts";
import type { CrmAiSettingsRepositoryPort } from "../../application/ports/crm-ai-settings-repository.port";

const MODULE_ID = "crm";
const SETTINGS_KEY = "ai-settings-v1";
const workspaceScope = (workspaceId: string) => `workspace:${workspaceId}`;

@Injectable()
export class PrismaCrmAiSettingsRepoAdapter implements CrmAiSettingsRepositoryPort {
  constructor(@Inject(EXT_KV_PORT) private readonly kv: ExtKvPort) {}

  async getSettings(tenantId: string, workspaceId: string): Promise<CrmAiSettings | null> {
    const entry = await this.kv.get({
      tenantId,
      moduleId: MODULE_ID,
      scope: workspaceScope(workspaceId),
      key: SETTINGS_KEY,
    });
    if (!entry) {
      return null;
    }
    const parsed = CrmAiSettingsSchema.safeParse(entry.value);
    if (!parsed.success) {
      return null;
    }
    return parsed.data;
  }

  async saveSettings(
    tenantId: string,
    workspaceId: string,
    settings: CrmAiSettings
  ): Promise<void> {
    await this.kv.set({
      tenantId,
      moduleId: MODULE_ID,
      scope: workspaceScope(workspaceId),
      key: SETTINGS_KEY,
      value: settings,
    });
  }
}
