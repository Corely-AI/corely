import { type EngagementSettingsRecord } from "../../domain/engagement.types";

export const ENGAGEMENT_SETTINGS_REPOSITORY_PORT = "engagement/settings-repository";

export interface EngagementSettingsRepositoryPort {
  getByTenant(tenantId: string): Promise<EngagementSettingsRecord | null>;
  upsert(settings: EngagementSettingsRecord): Promise<void>;
}
