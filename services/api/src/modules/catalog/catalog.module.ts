import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { AUDIT_PORT, OUTBOX_PORT } from "@corely/kernel";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { CatalogController } from "./http/catalog.controller";
import { CATALOG_REPOSITORY } from "./application/ports/catalog-repository.port";
import { PrismaCatalogRepositoryAdapter } from "./infrastructure/adapters/prisma-catalog-repository.adapter";
import { CreateCatalogItemUseCase } from "./application/use-cases/create-item.usecase";
import { UpdateCatalogItemUseCase } from "./application/use-cases/update-item.usecase";
import { ArchiveCatalogItemUseCase } from "./application/use-cases/archive-item.usecase";
import { GetCatalogItemUseCase } from "./application/use-cases/get-item.usecase";
import { ListCatalogItemsUseCase } from "./application/use-cases/list-items.usecase";
import { UpsertCatalogVariantUseCase } from "./application/use-cases/upsert-variant.usecase";
import { ArchiveCatalogVariantUseCase } from "./application/use-cases/archive-variant.usecase";
import { UpsertCatalogUomUseCase } from "./application/use-cases/upsert-uom.usecase";
import { ListCatalogUomsUseCase } from "./application/use-cases/list-uoms.usecase";
import { UpsertCatalogTaxProfileUseCase } from "./application/use-cases/upsert-tax-profile.usecase";
import { ListCatalogTaxProfilesUseCase } from "./application/use-cases/list-tax-profiles.usecase";
import { UpsertCatalogCategoryUseCase } from "./application/use-cases/upsert-category.usecase";
import { ListCatalogCategoriesUseCase } from "./application/use-cases/list-categories.usecase";
import { UpsertCatalogPriceListUseCase } from "./application/use-cases/upsert-price-list.usecase";
import { ListCatalogPriceListsUseCase } from "./application/use-cases/list-price-lists.usecase";
import { UpsertCatalogPriceUseCase } from "./application/use-cases/upsert-price.usecase";
import { ListCatalogPricesUseCase } from "./application/use-cases/list-prices.usecase";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../shared/ports/idempotency-storage.port";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";

const makeUseCase = (UseCaseClass: any) => ({
  provide: UseCaseClass,
  useFactory: (
    repo: PrismaCatalogRepositoryAdapter,
    idGenerator: any,
    clock: any,
    audit: any,
    outbox: any,
    idempotency: any
  ) =>
    new UseCaseClass({
      logger: new NestLoggerAdapter(),
      repo,
      idGenerator,
      clock,
      audit,
      outbox,
      idempotency,
    }),
  inject: [
    CATALOG_REPOSITORY,
    ID_GENERATOR_TOKEN,
    CLOCK_PORT_TOKEN,
    AUDIT_PORT,
    OUTBOX_PORT,
    IDEMPOTENCY_STORAGE_PORT_TOKEN,
  ],
});

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule],
  controllers: [CatalogController],
  providers: [
    PrismaCatalogRepositoryAdapter,
    { provide: CATALOG_REPOSITORY, useExisting: PrismaCatalogRepositoryAdapter },
    makeUseCase(CreateCatalogItemUseCase),
    makeUseCase(UpdateCatalogItemUseCase),
    makeUseCase(ArchiveCatalogItemUseCase),
    makeUseCase(GetCatalogItemUseCase),
    makeUseCase(ListCatalogItemsUseCase),
    makeUseCase(UpsertCatalogVariantUseCase),
    makeUseCase(ArchiveCatalogVariantUseCase),
    makeUseCase(UpsertCatalogUomUseCase),
    makeUseCase(ListCatalogUomsUseCase),
    makeUseCase(UpsertCatalogTaxProfileUseCase),
    makeUseCase(ListCatalogTaxProfilesUseCase),
    makeUseCase(UpsertCatalogCategoryUseCase),
    makeUseCase(ListCatalogCategoriesUseCase),
    makeUseCase(UpsertCatalogPriceListUseCase),
    makeUseCase(ListCatalogPriceListsUseCase),
    makeUseCase(UpsertCatalogPriceUseCase),
    makeUseCase(ListCatalogPricesUseCase),
  ],
  exports: [CATALOG_REPOSITORY],
})
export class CatalogModule {}
