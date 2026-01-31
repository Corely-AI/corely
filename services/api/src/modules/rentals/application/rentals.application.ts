import { type CreatePropertyUseCase } from "./use-cases/create-property.usecase";
import { type UpdatePropertyUseCase } from "./use-cases/update-property.usecase";
import { type ListPropertiesUseCase } from "./use-cases/list-properties.usecase";
import { type GetPropertyByIdUseCase } from "./use-cases/get-property-by-id.usecase";
import { type PublishPropertyUseCase } from "./use-cases/publish-property.usecase";
import { type CheckAvailabilityUseCase } from "./use-cases/check-availability.usecase";
import { type ListPublicPropertiesUseCase } from "./use-cases/list-public-properties.usecase";
import { type GetPublicPropertyUseCase } from "./use-cases/get-public-property.usecase";

export class RentalsApplication {
  constructor(
    public readonly createProperty: CreatePropertyUseCase,
    public readonly updateProperty: UpdatePropertyUseCase,
    public readonly listProperties: ListPropertiesUseCase,
    public readonly getProperty: GetPropertyByIdUseCase,
    public readonly publishProperty: PublishPropertyUseCase,
    public readonly checkAvailability: CheckAvailabilityUseCase,
    public readonly listPublicProperties: ListPublicPropertiesUseCase,
    public readonly getPublicProperty: GetPublicPropertyUseCase
  ) {}
}
