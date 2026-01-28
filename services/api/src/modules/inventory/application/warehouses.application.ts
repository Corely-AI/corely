import type { CreateWarehouseUseCase } from "./use-cases/create-warehouse.usecase";
import type { UpdateWarehouseUseCase } from "./use-cases/update-warehouse.usecase";
import type { GetWarehouseUseCase } from "./use-cases/get-warehouse.usecase";
import type { ListWarehousesUseCase } from "./use-cases/list-warehouses.usecase";
import type { CreateLocationUseCase } from "./use-cases/create-location.usecase";
import type { UpdateLocationUseCase } from "./use-cases/update-location.usecase";
import type { ListLocationsUseCase } from "./use-cases/list-locations.usecase";

export class WarehousesApplication {
  constructor(
    public readonly createWarehouse: CreateWarehouseUseCase,
    public readonly updateWarehouse: UpdateWarehouseUseCase,
    public readonly getWarehouse: GetWarehouseUseCase,
    public readonly listWarehouses: ListWarehousesUseCase,
    public readonly createLocation: CreateLocationUseCase,
    public readonly updateLocation: UpdateLocationUseCase,
    public readonly listLocations: ListLocationsUseCase
  ) {}
}
