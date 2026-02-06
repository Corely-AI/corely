import { Inject, Injectable } from "@nestjs/common";
import { EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import type { ClassesSettingsRepositoryPort } from "../../application/ports/classes-settings-repository.port";
import type { ClassesBillingSettings } from "../../domain/entities/classes.entities";

const MODULE_ID = "classes";
const SETTINGS_KEY = "billing-settings";
const workspaceScope = (workspaceId: string) => `workspace:${workspaceId}`;

@Injectable()
export class ExtKvClassesSettingsRepository implements ClassesSettingsRepositoryPort {
  constructor(@Inject(EXT_KV_PORT) private readonly kv: ExtKvPort) {}

  async getSettings(tenantId: string, workspaceId: string): Promise<ClassesBillingSettings | null> {
    const entry = await this.kv.get({
      tenantId,
      moduleId: MODULE_ID,
      scope: workspaceScope(workspaceId),
      key: SETTINGS_KEY,
    });
    return (entry?.value as ClassesBillingSettings) ?? null;
  }

  async saveSettings(
    tenantId: string,
    workspaceId: string,
    settings: ClassesBillingSettings
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
