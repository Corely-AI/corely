import { Inject, Injectable } from "@nestjs/common";
import { EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import type { RentalContactSettings } from "@corely/contracts";
import type { RentalSettingsRepositoryPort } from "../../application/ports/settings-repository.port";

const MODULE_ID = "rentals";
const SETTINGS_KEY = "contact-settings";
const workspaceScope = (workspaceId: string) => `workspace:${workspaceId}`;

@Injectable()
export class ExtKvRentalSettingsRepository implements RentalSettingsRepositoryPort {
  constructor(@Inject(EXT_KV_PORT) private readonly kv: ExtKvPort) {}

  async getSettings(tenantId: string, workspaceId: string): Promise<RentalContactSettings | null> {
    const entry = await this.kv.get({
      tenantId,
      moduleId: MODULE_ID,
      scope: workspaceScope(workspaceId),
      key: SETTINGS_KEY,
    });
    return (entry?.value as RentalContactSettings) ?? null;
  }

  async saveSettings(
    tenantId: string,
    workspaceId: string,
    settings: RentalContactSettings
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
