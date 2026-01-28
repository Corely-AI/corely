import {
  ValidationError,
  NotFoundError,
  parseLocalDate,
  type ClockPort,
  type IdGeneratorPort,
} from "@corely/kernel";
import type { InventoryDocumentLine, InventoryDocumentType } from "../../domain/inventory.types";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import type { LocationRepositoryPort } from "../ports/location-repository.port";
import type { WarehouseRepositoryPort } from "../ports/warehouse-repository.port";
import type { InventorySettingsRepositoryPort } from "../ports/settings-repository.port";
import { type InventorySettingsAggregate } from "../../domain/settings.aggregate";

export const buildLineItems = (params: {
  idGenerator: IdGeneratorPort;
  lineItems: Array<{
    id?: string;
    productId: string;
    quantity: number;
    unitCostCents?: number;
    fromLocationId?: string;
    toLocationId?: string;
    notes?: string;
  }>;
}): InventoryDocumentLine[] =>
  params.lineItems.map((item) => ({
    id: item.id ?? params.idGenerator.newId(),
    productId: item.productId,
    quantity: item.quantity,
    unitCostCents: item.unitCostCents ?? null,
    fromLocationId: item.fromLocationId ?? null,
    toLocationId: item.toLocationId ?? null,
    notes: item.notes ?? null,
    reservedQuantity: null,
  }));

export const localDateFromIso = (value?: string | null) => (value ? parseLocalDate(value) : null);

export const optionalLocalDate = (value?: string | null) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return parseLocalDate(value);
};

export const requireLocation = (value: string | null | undefined, label: string) => {
  if (!value) {
    throw new ValidationError(`${label} is required`, undefined, "LOCATION_REQUIRED");
  }
};

export const ensureDefaultWarehouseId = async (params: {
  tenantId: string;
  settings: InventorySettingsAggregate | null;
  warehouseRepo: WarehouseRepositoryPort;
}): Promise<string | null> => {
  if (params.settings?.toProps().defaultWarehouseId) {
    return params.settings.toProps().defaultWarehouseId ?? null;
  }
  const defaultWarehouse = await params.warehouseRepo.findDefault(params.tenantId);
  return defaultWarehouse?.id ?? null;
};

export const getDefaultLocation = async (params: {
  tenantId: string;
  warehouseId: string;
  locationRepo: LocationRepositoryPort;
  locationType: "INTERNAL" | "RECEIVING" | "SHIPPING";
}): Promise<string | null> => {
  const location = await params.locationRepo.findByWarehouseType(
    params.tenantId,
    params.warehouseId,
    params.locationType
  );
  return location?.id ?? null;
};

export const validateLineLocations = async (params: {
  tenantId: string;
  documentType: InventoryDocumentType;
  lines: InventoryDocumentLine[];
  settings: InventorySettingsAggregate | null;
  warehouseRepo: WarehouseRepositoryPort;
  locationRepo: LocationRepositoryPort;
}): Promise<InventoryDocumentLine[]> => {
  const defaultWarehouseId = await ensureDefaultWarehouseId({
    tenantId: params.tenantId,
    settings: params.settings,
    warehouseRepo: params.warehouseRepo,
  });

  const resolvedLines: InventoryDocumentLine[] = [];

  for (const line of params.lines) {
    const updated = { ...line };

    if (params.documentType === "RECEIPT") {
      if (!updated.toLocationId && defaultWarehouseId) {
        updated.toLocationId = await getDefaultLocation({
          tenantId: params.tenantId,
          warehouseId: defaultWarehouseId,
          locationRepo: params.locationRepo,
          locationType: "RECEIVING",
        });
      }
      requireLocation(updated.toLocationId, "toLocationId");
    }

    if (params.documentType === "DELIVERY") {
      if (!updated.fromLocationId && defaultWarehouseId) {
        updated.fromLocationId = await getDefaultLocation({
          tenantId: params.tenantId,
          warehouseId: defaultWarehouseId,
          locationRepo: params.locationRepo,
          locationType: "INTERNAL",
        });
      }
      requireLocation(updated.fromLocationId, "fromLocationId");
    }

    if (params.documentType === "TRANSFER") {
      requireLocation(updated.fromLocationId, "fromLocationId");
      requireLocation(updated.toLocationId, "toLocationId");
      if (updated.fromLocationId === updated.toLocationId) {
        throw new ValidationError("fromLocationId and toLocationId must differ");
      }
    }

    if (params.documentType === "ADJUSTMENT") {
      if (!updated.fromLocationId && !updated.toLocationId) {
        throw new ValidationError(
          "Adjustment requires fromLocationId or toLocationId",
          undefined,
          "LOCATION_REQUIRED"
        );
      }
      if (updated.fromLocationId && updated.toLocationId) {
        throw new ValidationError("Adjustment cannot set both from and to locations");
      }
    }

    resolvedLines.push(updated);
  }

  return resolvedLines;
};

export const validateProducts = async (params: {
  tenantId: string;
  productRepo: ProductRepositoryPort;
  lines: InventoryDocumentLine[];
}): Promise<void> => {
  for (const line of params.lines) {
    const product = await params.productRepo.findById(params.tenantId, line.productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    if (product.productType === "SERVICE") {
      throw new ValidationError(
        "Service products cannot be stocked",
        undefined,
        "PRODUCT_INACTIVE"
      );
    }
    if (!product.isActive) {
      throw new ValidationError(
        "Product is inactive",
        { productId: product.id },
        "PRODUCT_INACTIVE"
      );
    }
  }
};

export const resolvePostingDate = (params: {
  postingDate?: string | null;
  documentPostingDate?: string | null;
}): string => {
  return params.postingDate || params.documentPostingDate || new Date().toISOString().slice(0, 10);
};
