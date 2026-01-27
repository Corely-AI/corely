import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { InventoryController } from "./adapters/http/inventory.controller";
import { InventoryApplication } from "./application/inventory.application";

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
  controllers: [InventoryController],
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
  exports: [InventoryApplication],
})
export class InventoryModule {}
