import type { ClockPort, IdGeneratorPort, LoggerPort, AuditPort } from "@corely/kernel";
import type { InventoryDocumentRepositoryPort } from "../ports/document-repository.port";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import type { WarehouseRepositoryPort } from "../ports/warehouse-repository.port";
import type { StockMoveRepositoryPort } from "../ports/stock-move-repository.port";
import type { StockReservationRepositoryPort } from "../ports/stock-reservation-repository.port";
import type { InventorySettingsRepositoryPort } from "../ports/settings-repository.port";
import type { InventoryLotRepositoryPort } from "../ports/inventory-lot-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { CatalogRepositoryPort } from "../../../catalog/application/ports/catalog-repository.port";

export type DocumentDeps = {
  logger: LoggerPort;
  repo: InventoryDocumentRepositoryPort;
  productRepo: ProductRepositoryPort;
  locationRepo: LocationRepositoryPort;
  warehouseRepo: WarehouseRepositoryPort;
  moveRepo: StockMoveRepositoryPort;
  reservationRepo: StockReservationRepositoryPort;
  settingsRepo: InventorySettingsRepositoryPort;
  lotRepo?: InventoryLotRepositoryPort;
  catalogRepo?: CatalogRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};
