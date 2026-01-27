import type { ClockPort, IdGeneratorPort, LoggerPort, AuditPort } from "@corely/kernel";
import type { ReorderPolicyRepositoryPort } from "../ports/reorder-policy-repository.port";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import type { WarehouseRepositoryPort } from "../ports/warehouse-repository.port";
import type { StockMoveRepositoryPort } from "../ports/stock-move-repository.port";
import type { StockReservationRepositoryPort } from "../ports/stock-reservation-repository.port";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import { toReorderSuggestionDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

export type ReorderDeps = {
  logger: LoggerPort;
  repo: ReorderPolicyRepositoryPort;
  productRepo: ProductRepositoryPort;
  warehouseRepo: WarehouseRepositoryPort;
  locationRepo: LocationRepositoryPort;
  moveRepo: StockMoveRepositoryPort;
  reservationRepo: StockReservationRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

export const sumByProduct = (rows: Array<{ productId: string; value: number }>) => {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    map.set(row.productId, (map.get(row.productId) ?? 0) + row.value);
  });
  return map;
};

export const buildSuggestions = async (params: {
  tenantId: string;
  policies: Array<{
    productId: string;
    warehouseId: string;
    reorderPoint?: number | null;
    minQty: number;
    preferredSupplierPartyId?: string | null;
  }>;
  thresholdMode: "MIN" | "REORDER_POINT";
  locationRepo: LocationRepositoryPort;
  moveRepo: StockMoveRepositoryPort;
  reservationRepo: StockReservationRepositoryPort;
}): Promise<ReturnType<typeof toReorderSuggestionDto>[]> => {
  const suggestions: ReturnType<typeof toReorderSuggestionDto>[] = [];
  const grouped = new Map<string, Array<(typeof params.policies)[number]>>();

  params.policies.forEach((policy) => {
    const list = grouped.get(policy.warehouseId) ?? [];
    list.push(policy);
    grouped.set(policy.warehouseId, list);
  });

  for (const [warehouseId, groupPolicies] of grouped.entries()) {
    const locations = await params.locationRepo.listByWarehouse(params.tenantId, warehouseId);
    const locationIds = locations.map((loc) => loc.id);
    const productIds = groupPolicies.map((policy) => policy.productId);

    const onHand = await params.moveRepo.sumByProductLocation(params.tenantId, {
      productIds,
      locationIds,
    });
    const reserved = await params.reservationRepo.sumActiveByProductLocation(params.tenantId, {
      productIds,
      locationIds,
    });

    const onHandMap = sumByProduct(
      onHand.map((row) => ({
        productId: row.productId,
        value: row.quantityDelta,
      }))
    );
    const reservedMap = sumByProduct(
      reserved.map((row) => ({
        productId: row.productId,
        value: row.reservedQty,
      }))
    );

    groupPolicies.forEach((policy) => {
      const availableQty =
        (onHandMap.get(policy.productId) ?? 0) - (reservedMap.get(policy.productId) ?? 0);
      const threshold =
        params.thresholdMode === "MIN" ? policy.minQty : (policy.reorderPoint ?? policy.minQty);
      if (availableQty <= threshold) {
        suggestions.push(
          toReorderSuggestionDto({
            productId: policy.productId,
            warehouseId,
            availableQty,
            reorderPoint: policy.reorderPoint ?? null,
            minQty: policy.minQty,
            suggestedQty: Math.max(threshold - availableQty, 0),
            preferredSupplierPartyId: policy.preferredSupplierPartyId ?? null,
          })
        );
      }
    });
  }

  return suggestions;
};
