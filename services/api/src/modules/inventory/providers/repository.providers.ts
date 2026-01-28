import { type Provider } from "@nestjs/common";

import { PrismaProductRepository } from "../infrastructure/adapters/prisma-product-repository.adapter";
import { PrismaWarehouseRepository } from "../infrastructure/adapters/prisma-warehouse-repository.adapter";
import { PrismaLocationRepository } from "../infrastructure/adapters/prisma-location-repository.adapter";
import { PrismaInventoryDocumentRepository } from "../infrastructure/adapters/prisma-document-repository.adapter";
import { PrismaStockMoveRepository } from "../infrastructure/adapters/prisma-stock-move-repository.adapter";
import { PrismaStockReservationRepository } from "../infrastructure/adapters/prisma-stock-reservation-repository.adapter";
import { PrismaReorderPolicyRepository } from "../infrastructure/adapters/prisma-reorder-policy-repository.adapter";
import { PrismaInventorySettingsRepository } from "../infrastructure/adapters/prisma-settings-repository.adapter";

import { PRODUCT_REPO } from "../application/ports/product-repository.port";
import { WAREHOUSE_REPO } from "../application/ports/warehouse-repository.port";
import { LOCATION_REPO } from "../application/ports/location-repository.port";
import { DOCUMENT_REPO } from "../application/ports/document-repository.port";
import { STOCK_MOVE_REPO } from "../application/ports/stock-move-repository.port";
import { STOCK_RESERVATION_REPO } from "../application/ports/stock-reservation-repository.port";
import { REORDER_POLICY_REPO } from "../application/ports/reorder-policy-repository.port";
import { INVENTORY_SETTINGS_REPO } from "../application/ports/settings-repository.port";

export const repositoryProviders: Provider[] = [
  PrismaProductRepository,
  PrismaWarehouseRepository,
  PrismaLocationRepository,
  PrismaInventoryDocumentRepository,
  PrismaStockMoveRepository,
  PrismaStockReservationRepository,
  PrismaReorderPolicyRepository,
  PrismaInventorySettingsRepository,
  { provide: PRODUCT_REPO, useExisting: PrismaProductRepository },
  { provide: WAREHOUSE_REPO, useExisting: PrismaWarehouseRepository },
  { provide: LOCATION_REPO, useExisting: PrismaLocationRepository },
  { provide: DOCUMENT_REPO, useExisting: PrismaInventoryDocumentRepository },
  { provide: STOCK_MOVE_REPO, useExisting: PrismaStockMoveRepository },
  { provide: STOCK_RESERVATION_REPO, useExisting: PrismaStockReservationRepository },
  { provide: REORDER_POLICY_REPO, useExisting: PrismaReorderPolicyRepository },
  { provide: INVENTORY_SETTINGS_REPO, useExisting: PrismaInventorySettingsRepository },
];
