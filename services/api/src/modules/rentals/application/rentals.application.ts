import { type CreatePropertyUseCase } from "./use-cases/create-property.usecase";
import { type UpdatePropertyUseCase } from "./use-cases/update-property.usecase";
import { type ListPropertiesUseCase } from "./use-cases/list-properties.usecase";
import { type GetPropertyByIdUseCase } from "./use-cases/get-property-by-id.usecase";
import { type PublishPropertyUseCase } from "./use-cases/publish-property.usecase";
import { type CheckAvailabilityUseCase } from "./use-cases/check-availability.usecase";
import { type ListPublicPropertiesUseCase } from "./use-cases/list-public-properties.usecase";
import { type GetPublicPropertyUseCase } from "./use-cases/get-public-property.usecase";
import { type CreateCategoryUseCase } from "./use-cases/create-category.usecase";
import { type UpdateCategoryUseCase } from "./use-cases/update-category.usecase";
import { type ListCategoriesUseCase } from "./use-cases/list-categories.usecase";
import { type DeleteCategoryUseCase } from "./use-cases/delete-category.usecase";
import { type GetRentalSettingsUseCase } from "./use-cases/get-rental-settings.usecase";
import { type UpdateRentalSettingsUseCase } from "./use-cases/update-rental-settings.usecase";
import { type GetPublicRentalSettingsUseCase } from "./use-cases/get-public-rental-settings.usecase";

export class RentalsApplication {
  constructor(
    public readonly createProperty: CreatePropertyUseCase,
    public readonly updateProperty: UpdatePropertyUseCase,
    public readonly listProperties: ListPropertiesUseCase,
    public readonly getProperty: GetPropertyByIdUseCase,
    public readonly publishProperty: PublishPropertyUseCase,
    public readonly checkAvailability: CheckAvailabilityUseCase,
    public readonly listPublicProperties: ListPublicPropertiesUseCase,
    public readonly getPublicProperty: GetPublicPropertyUseCase,
    public readonly createCategory: CreateCategoryUseCase,
    public readonly updateCategory: UpdateCategoryUseCase,
    public readonly listCategories: ListCategoriesUseCase,
    public readonly deleteCategory: DeleteCategoryUseCase,
    public readonly getSettings: GetRentalSettingsUseCase,
    public readonly updateSettings: UpdateRentalSettingsUseCase,
    public readonly getPublicSettings: GetPublicRentalSettingsUseCase
  ) {}
}
