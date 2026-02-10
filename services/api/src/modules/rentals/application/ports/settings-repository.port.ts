import type { RentalContactSettings } from "@corely/contracts";

export interface RentalSettingsRepositoryPort {
  getSettings(tenantId: string, workspaceId: string): Promise<RentalContactSettings | null>;
  saveSettings(
    tenantId: string,
    workspaceId: string,
    settings: RentalContactSettings
  ): Promise<void>;
}

export const RENTAL_SETTINGS_REPOSITORY_PORT = Symbol("RENTAL_SETTINGS_REPOSITORY_PORT");
