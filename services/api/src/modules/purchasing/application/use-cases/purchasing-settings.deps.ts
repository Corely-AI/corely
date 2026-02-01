import { type ClockPort, type IdGeneratorPort, type LoggerPort } from "@corely/kernel";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

export type SettingsDeps = {
  logger: LoggerPort;
  settingsRepo: PurchasingSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
};
