import {
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type AuditPort,
} from "@corely/kernel";
import type { PurchaseOrderRepositoryPort } from "../ports/purchase-order-repository.port";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import type { SupplierQueryPort } from "../ports/supplier-query.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

export type PurchaseOrderDeps = {
  logger: LoggerPort;
  repo: PurchaseOrderRepositoryPort;
  settingsRepo: PurchasingSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  supplierQuery: SupplierQueryPort;
  audit: AuditPort;
};
