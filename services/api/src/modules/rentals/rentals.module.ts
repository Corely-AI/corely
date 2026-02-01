import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { RentalsPropertyController } from "./adapters/http/rentals-property.controller";
import { PublicRentalsController } from "./adapters/http/public-rentals.controller";
import { RentalsApplication } from "./application/rentals.application";
import { PrismaPropertyRepoAdapter } from "./infrastructure/prisma/prisma-property-repo.adapter";
import { PrismaCategoryRepoAdapter } from "./infrastructure/prisma/prisma-category-repo.adapter";
import { PrismaAvailabilityRepoAdapter } from "./infrastructure/prisma/prisma-availability-repo.adapter";
import { PROPERTY_REPO_PORT } from "./application/ports/property-repository.port";
import { CATEGORY_REPO_PORT } from "./application/ports/category-repository.port";
import { AVAILABILITY_REPO_PORT } from "./application/ports/availability-repository.port";
import { CreatePropertyUseCase } from "./application/use-cases/create-property.usecase";
import { UpdatePropertyUseCase } from "./application/use-cases/update-property.usecase";
import { ListPropertiesUseCase } from "./application/use-cases/list-properties.usecase";
import { GetPropertyByIdUseCase } from "./application/use-cases/get-property-by-id.usecase";
import { PublishPropertyUseCase } from "./application/use-cases/publish-property.usecase";
import { CheckAvailabilityUseCase } from "./application/use-cases/check-availability.usecase";
import { ListPublicPropertiesUseCase } from "./application/use-cases/list-public-properties.usecase";
import { GetPublicPropertyUseCase } from "./application/use-cases/get-public-property.usecase";
import { CreateCategoryUseCase } from "./application/use-cases/create-category.usecase";
import { UpdateCategoryUseCase } from "./application/use-cases/update-category.usecase";
import { ListCategoriesUseCase } from "./application/use-cases/list-categories.usecase";
import { DeleteCategoryUseCase } from "./application/use-cases/delete-category.usecase";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { RentalsCategoryController } from "./adapters/http/rentals-category.controller";

@Module({
  imports: [DataModule, KernelModule, IdentityModule],
  controllers: [RentalsPropertyController, RentalsCategoryController, PublicRentalsController],
  providers: [
    PrismaPropertyRepoAdapter,
    { provide: PROPERTY_REPO_PORT, useExisting: PrismaPropertyRepoAdapter },
    PrismaCategoryRepoAdapter,
    { provide: CATEGORY_REPO_PORT, useExisting: PrismaCategoryRepoAdapter },
    PrismaAvailabilityRepoAdapter,
    { provide: AVAILABILITY_REPO_PORT, useExisting: PrismaAvailabilityRepoAdapter },
    {
      provide: CreatePropertyUseCase,
      useFactory: (repo: PrismaPropertyRepoAdapter) =>
        new CreatePropertyUseCase({ propertyRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [PROPERTY_REPO_PORT],
    },
    {
      provide: UpdatePropertyUseCase,
      useFactory: (repo: PrismaPropertyRepoAdapter) =>
        new UpdatePropertyUseCase({ propertyRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [PROPERTY_REPO_PORT],
    },
    {
      provide: ListPropertiesUseCase,
      useFactory: (repo: PrismaPropertyRepoAdapter) =>
        new ListPropertiesUseCase({ propertyRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [PROPERTY_REPO_PORT],
    },
    {
      provide: GetPropertyByIdUseCase,
      useFactory: (repo: PrismaPropertyRepoAdapter) =>
        new GetPropertyByIdUseCase({ propertyRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [PROPERTY_REPO_PORT],
    },
    {
      provide: PublishPropertyUseCase,
      useFactory: (repo: PrismaPropertyRepoAdapter) =>
        new PublishPropertyUseCase({ propertyRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [PROPERTY_REPO_PORT],
    },
    {
      provide: CheckAvailabilityUseCase,
      useFactory: (
        availabilityRepo: PrismaAvailabilityRepoAdapter,
        propertyRepo: PrismaPropertyRepoAdapter
      ) =>
        new CheckAvailabilityUseCase({
          availabilityRepo,
          propertyRepo,
          logger: new NestLoggerAdapter(),
        } as any),
      inject: [AVAILABILITY_REPO_PORT, PROPERTY_REPO_PORT],
    },
    {
      provide: ListPublicPropertiesUseCase,
      useFactory: (repo: PrismaPropertyRepoAdapter) =>
        new ListPublicPropertiesUseCase({
          propertyRepo: repo,
          logger: new NestLoggerAdapter(),
        } as any),
      inject: [PROPERTY_REPO_PORT],
    },
    {
      provide: GetPublicPropertyUseCase,
      useFactory: (repo: PrismaPropertyRepoAdapter) =>
        new GetPublicPropertyUseCase({
          propertyRepo: repo,
          logger: new NestLoggerAdapter(),
        } as any),
      inject: [PROPERTY_REPO_PORT],
    },
    {
      provide: CreateCategoryUseCase,
      useFactory: (repo: PrismaCategoryRepoAdapter) =>
        new CreateCategoryUseCase({ categoryRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [CATEGORY_REPO_PORT],
    },
    {
      provide: UpdateCategoryUseCase,
      useFactory: (repo: PrismaCategoryRepoAdapter) =>
        new UpdateCategoryUseCase({ categoryRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [CATEGORY_REPO_PORT],
    },
    {
      provide: ListCategoriesUseCase,
      useFactory: (repo: PrismaCategoryRepoAdapter) =>
        new ListCategoriesUseCase({ categoryRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [CATEGORY_REPO_PORT],
    },
    {
      provide: DeleteCategoryUseCase,
      useFactory: (repo: PrismaCategoryRepoAdapter) =>
        new DeleteCategoryUseCase({ categoryRepo: repo, logger: new NestLoggerAdapter() } as any),
      inject: [CATEGORY_REPO_PORT],
    },
    {
      provide: RentalsApplication,
      useFactory: (
        createProperty: CreatePropertyUseCase,
        updateProperty: UpdatePropertyUseCase,
        listProperties: ListPropertiesUseCase,
        getProperty: GetPropertyByIdUseCase,
        publishProperty: PublishPropertyUseCase,
        checkAvailability: CheckAvailabilityUseCase,
        listPublicProperties: ListPublicPropertiesUseCase,
        getPublicProperty: GetPublicPropertyUseCase,
        createCategory: CreateCategoryUseCase,
        updateCategory: UpdateCategoryUseCase,
        listCategories: ListCategoriesUseCase,
        deleteCategory: DeleteCategoryUseCase
      ) =>
        new RentalsApplication(
          createProperty,
          updateProperty,
          listProperties,
          getProperty,
          publishProperty,
          checkAvailability,
          listPublicProperties,
          getPublicProperty,
          createCategory,
          updateCategory,
          listCategories,
          deleteCategory
        ),
      inject: [
        CreatePropertyUseCase,
        UpdatePropertyUseCase,
        ListPropertiesUseCase,
        GetPropertyByIdUseCase,
        PublishPropertyUseCase,
        CheckAvailabilityUseCase,
        ListPublicPropertiesUseCase,
        GetPublicPropertyUseCase,
        CreateCategoryUseCase,
        UpdateCategoryUseCase,
        ListCategoriesUseCase,
        DeleteCategoryUseCase,
      ],
    },
  ],
  exports: [RentalsApplication],
})
export class RentalsModule {}
