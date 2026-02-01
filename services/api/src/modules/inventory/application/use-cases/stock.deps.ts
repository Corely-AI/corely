import type { LoggerPort } from "@corely/kernel";
import type { StockMoveRepositoryPort } from "../ports/stock-move-repository.port";
import type { StockReservationRepositoryPort } from "../ports/stock-reservation-repository.port";
import type { LocationRepositoryPort } from "../ports/location-repository.port";

export type StockDeps = {
  logger: LoggerPort;
  moveRepo: StockMoveRepositoryPort;
  reservationRepo: StockReservationRepositoryPort;
  locationRepo: LocationRepositoryPort;
};

export const buildLocationFilter = async (params: {
  tenantId: string;
  warehouseId?: string;
  locationId?: string;
  locationRepo: LocationRepositoryPort;
}): Promise<string[] | undefined> => {
  if (params.locationId) {
    return [params.locationId];
  }
  if (params.warehouseId) {
    const locations = await params.locationRepo.listByWarehouse(
      params.tenantId,
      params.warehouseId
    );
    return locations.map((location) => location.id);
  }
  return undefined;
};
