import {
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type AuditPort,
} from "@corely/kernel";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

export type SettingsDeps = {
  logger: LoggerPort;
  settingsRepo: SalesSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};
