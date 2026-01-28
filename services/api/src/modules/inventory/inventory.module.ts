import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { ProductsController } from "./adapters/http/products.controller";
import { WarehousesController } from "./adapters/http/warehouses.controller";
import { InventoryDocumentsController } from "./adapters/http/inventory-documents.controller";
import { StockController } from "./adapters/http/stock.controller";
import { InventoryApplication } from "./application/inventory.application";
import { ProductsApplication } from "./application/products.application";
import { WarehousesApplication } from "./application/warehouses.application";
import { InventoryDocumentsApplication } from "./application/inventory-documents.application";
import { StockApplication } from "./application/stock.application";

import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";

import { repositoryProviders } from "./providers/repository.providers";
import { productProviders } from "./providers/product.providers";
import { warehouseProviders } from "./providers/warehouse.providers";
import { locationProviders } from "./providers/location.providers";
import { documentProviders } from "./providers/document.providers";
import { stockProviders } from "./providers/stock.providers";
import { reorderProviders } from "./providers/reorder.providers";
import { applicationProviders } from "./providers/application.providers";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule],
  controllers: [
    ProductsController,
    WarehousesController,
    InventoryDocumentsController,
    StockController,
  ],
  providers: [
    ...repositoryProviders,
    ...productProviders,
    ...warehouseProviders,
    ...locationProviders,
    ...documentProviders,
    ...stockProviders,
    ...reorderProviders,
    ...applicationProviders,
  ],
  exports: [
    InventoryApplication,
    ProductsApplication,
    WarehousesApplication,
    InventoryDocumentsApplication,
    StockApplication,
  ],
})
export class InventoryModule {}
