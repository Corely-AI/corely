import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity/identity.module";
import { PlatformModule } from "../platform/platform.module";
import {
  CUSTOM_FIELDS_READ_PORT,
  CUSTOM_FIELDS_WRITE_PORT,
  DIMENSIONS_READ_PORT,
  DIMENSIONS_WRITE_PORT,
} from "./application/ports/custom-attributes.ports";
import { DimensionsPrismaAdapter } from "./infrastructure/dimensions-prisma.adapter";
import { CustomFieldValuesAdapter } from "./infrastructure/custom-field-values.adapter";
import {
  CreateDimensionTypeUseCase,
  UpdateDimensionTypeUseCase,
  DeleteDimensionTypeUseCase,
  CreateDimensionValueUseCase,
  UpdateDimensionValueUseCase,
  DeleteDimensionValueUseCase,
  SetEntityDimensionsUseCase,
  GetEntityDimensionsUseCase,
  ResolveEntityIdsByDimensionFiltersUseCase,
} from "./application/use-cases/dimensions.usecases";
import {
  GetEntityCustomFieldValuesUseCase,
  SetEntityCustomFieldValuesUseCase,
  DeleteEntityCustomFieldValuesUseCase,
  ResolveEntityIdsByCustomFieldFiltersUseCase,
  ListIndexedCustomFieldsUseCase,
} from "./application/use-cases/custom-field-values.usecases";
import { DimensionsController } from "./http/dimensions.controller";
import { CustomFieldValuesController } from "./http/custom-field-values.controller";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule],
  controllers: [DimensionsController, CustomFieldValuesController],
  providers: [
    DimensionsPrismaAdapter,
    CustomFieldValuesAdapter,
    {
      provide: DIMENSIONS_READ_PORT,
      useExisting: DimensionsPrismaAdapter,
    },
    {
      provide: DIMENSIONS_WRITE_PORT,
      useExisting: DimensionsPrismaAdapter,
    },
    {
      provide: CUSTOM_FIELDS_READ_PORT,
      useExisting: CustomFieldValuesAdapter,
    },
    {
      provide: CUSTOM_FIELDS_WRITE_PORT,
      useExisting: CustomFieldValuesAdapter,
    },
    CreateDimensionTypeUseCase,
    UpdateDimensionTypeUseCase,
    DeleteDimensionTypeUseCase,
    CreateDimensionValueUseCase,
    UpdateDimensionValueUseCase,
    DeleteDimensionValueUseCase,
    SetEntityDimensionsUseCase,
    GetEntityDimensionsUseCase,
    ResolveEntityIdsByDimensionFiltersUseCase,
    GetEntityCustomFieldValuesUseCase,
    SetEntityCustomFieldValuesUseCase,
    DeleteEntityCustomFieldValuesUseCase,
    ResolveEntityIdsByCustomFieldFiltersUseCase,
    ListIndexedCustomFieldsUseCase,
  ],
  exports: [
    DIMENSIONS_READ_PORT,
    DIMENSIONS_WRITE_PORT,
    CUSTOM_FIELDS_READ_PORT,
    CUSTOM_FIELDS_WRITE_PORT,
    ResolveEntityIdsByDimensionFiltersUseCase,
    ResolveEntityIdsByCustomFieldFiltersUseCase,
  ],
})
export class PlatformCustomAttributesModule {}
