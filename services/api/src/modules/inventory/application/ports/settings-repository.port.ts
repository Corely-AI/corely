import type { InventorySettingsAggregate } from "../../domain/settings.aggregate";

export const INVENTORY_SETTINGS_REPO = "inventory/settings-repository";

export interface InventorySettingsRepositoryPort {
  findByTenant(tenantId: string): Promise<InventorySettingsAggregate | null>;
  save(settings: InventorySettingsAggregate): Promise<void>;
}
