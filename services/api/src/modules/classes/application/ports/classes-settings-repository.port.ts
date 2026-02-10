import type { ClassesBillingSettings } from "../../domain/entities/classes.entities";

export interface ClassesSettingsRepositoryPort {
  getSettings(tenantId: string, workspaceId: string): Promise<ClassesBillingSettings | null>;
  saveSettings(
    tenantId: string,
    workspaceId: string,
    settings: ClassesBillingSettings
  ): Promise<void>;
}

export const CLASSES_SETTINGS_REPOSITORY_PORT = "classes/settings-repository";
