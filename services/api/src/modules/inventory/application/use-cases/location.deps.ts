import type { ClockPort, IdGeneratorPort, LoggerPort, AuditPort } from "@corely/kernel";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import type { WarehouseRepositoryPort } from "../ports/warehouse-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

export type LocationDeps = {
  logger: LoggerPort;
  repo: LocationRepositoryPort;
  warehouseRepo: WarehouseRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};
