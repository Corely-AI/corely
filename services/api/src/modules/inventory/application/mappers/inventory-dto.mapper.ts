import type {
  InventoryDocumentDto,
  InventoryDocumentLineDto,
  InventoryLotDto,
  LocationDto,
  ProductDto,
  ReorderPolicyDto,
  ReorderSuggestionDto,
  StockLevelDto,
  StockMoveDto,
  StockReservationDto,
  WarehouseDto,
} from "@corely/contracts";
import type { LocalDate } from "@corely/kernel";
import type { InventoryDocumentAggregate } from "../../domain/inventory-document.aggregate";
import type {
  InventoryDocumentLine,
  StockMove,
  StockReservation,
} from "../../domain/inventory.types";
import type { InventoryLocation } from "../ports/location-repository.port";
import type { InventoryLot } from "../ports/inventory-lot-repository.port";
import type { InventoryProduct } from "../ports/product-repository.port";
import type { ReorderPolicy } from "../ports/reorder-policy-repository.port";
import type { InventoryWarehouse } from "../ports/warehouse-repository.port";

const toLocalDateString = (date: LocalDate | null | undefined): string | null =>
  date ? (date as string) : null;

export const toProductDto = (product: InventoryProduct): ProductDto => ({
  id: product.id,
  tenantId: product.tenantId,
  sku: product.sku,
  name: product.name,
  productType: product.productType,
  unitOfMeasure: product.unitOfMeasure,
  barcode: product.barcode ?? null,
  defaultSalesPriceCents: product.defaultSalesPriceCents ?? null,
  defaultPurchaseCostCents: product.defaultPurchaseCostCents ?? null,
  isActive: product.isActive,
  tags: product.tags,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
});

export const toWarehouseDto = (warehouse: InventoryWarehouse): WarehouseDto => ({
  id: warehouse.id,
  tenantId: warehouse.tenantId,
  name: warehouse.name,
  isDefault: warehouse.isDefault,
  address: warehouse.address ?? null,
  createdAt: warehouse.createdAt.toISOString(),
  updatedAt: warehouse.updatedAt.toISOString(),
});

export const toLocationDto = (location: InventoryLocation): LocationDto => ({
  id: location.id,
  tenantId: location.tenantId,
  warehouseId: location.warehouseId,
  name: location.name,
  locationType: location.locationType,
  isActive: location.isActive,
  createdAt: location.createdAt.toISOString(),
  updatedAt: location.updatedAt.toISOString(),
});

const toDocumentLineDto = (line: InventoryDocumentLine): InventoryDocumentLineDto => ({
  id: line.id,
  productId: line.productId,
  quantity: line.quantity,
  unitCostCents: line.unitCostCents ?? null,
  fromLocationId: line.fromLocationId ?? null,
  toLocationId: line.toLocationId ?? null,
  notes: line.notes ?? null,
  reservedQuantity: line.reservedQuantity ?? undefined,
  lotNumber: line.lotNumber ?? null,
  mfgDate: toLocalDateString(line.mfgDate),
  expiryDate: toLocalDateString(line.expiryDate),
});

export const toInventoryDocumentDto = (doc: InventoryDocumentAggregate): InventoryDocumentDto => ({
  id: doc.id,
  tenantId: doc.tenantId,
  documentType: doc.documentType,
  documentNumber: doc.documentNumber,
  status: doc.status,
  reference: doc.reference ?? null,
  scheduledDate: toLocalDateString(doc.scheduledDate),
  postingDate: toLocalDateString(doc.postingDate),
  notes: doc.notes ?? null,
  partyId: doc.partyId ?? null,
  sourceType: doc.sourceType ?? null,
  sourceId: doc.sourceId ?? null,
  lines: doc.lines.map(toDocumentLineDto),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  confirmedAt: doc.confirmedAt ? doc.confirmedAt.toISOString() : null,
  postedAt: doc.postedAt ? doc.postedAt.toISOString() : null,
  canceledAt: doc.canceledAt ? doc.canceledAt.toISOString() : null,
});

export const toStockMoveDto = (move: StockMove): StockMoveDto => ({
  id: move.id,
  tenantId: move.tenantId,
  postingDate: move.postingDate as string,
  productId: move.productId,
  quantityDelta: move.quantityDelta,
  locationId: move.locationId,
  documentType: move.documentType,
  documentId: move.documentId,
  lineId: move.lineId,
  reasonCode: move.reasonCode,
  createdAt: move.createdAt.toISOString(),
});

export const toStockReservationDto = (reservation: StockReservation): StockReservationDto => ({
  id: reservation.id,
  tenantId: reservation.tenantId,
  productId: reservation.productId,
  locationId: reservation.locationId,
  documentId: reservation.documentId,
  reservedQty: reservation.reservedQty,
  status: reservation.status,
  createdAt: reservation.createdAt.toISOString(),
  releasedAt: reservation.releasedAt ? reservation.releasedAt.toISOString() : null,
  fulfilledAt: reservation.fulfilledAt ? reservation.fulfilledAt.toISOString() : null,
});

export const toReorderPolicyDto = (policy: ReorderPolicy): ReorderPolicyDto => ({
  id: policy.id,
  tenantId: policy.tenantId,
  productId: policy.productId,
  warehouseId: policy.warehouseId,
  minQty: policy.minQty,
  maxQty: policy.maxQty ?? null,
  reorderPoint: policy.reorderPoint ?? null,
  preferredSupplierPartyId: policy.preferredSupplierPartyId ?? null,
  leadTimeDays: policy.leadTimeDays ?? null,
  isActive: policy.isActive,
  createdAt: policy.createdAt.toISOString(),
  updatedAt: policy.updatedAt.toISOString(),
});

export const toReorderSuggestionDto = (params: {
  productId: string;
  warehouseId: string;
  availableQty: number;
  reorderPoint?: number | null;
  minQty?: number | null;
  suggestedQty: number;
  preferredSupplierPartyId?: string | null;
}): ReorderSuggestionDto => ({
  productId: params.productId,
  warehouseId: params.warehouseId,
  availableQty: params.availableQty,
  reorderPoint: params.reorderPoint ?? null,
  minQty: params.minQty ?? null,
  suggestedQty: params.suggestedQty,
  preferredSupplierPartyId: params.preferredSupplierPartyId ?? null,
});

export const toStockLevelDto = (params: {
  productId: string;
  warehouseId?: string | null;
  locationId?: string | null;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
}): StockLevelDto => ({
  productId: params.productId,
  warehouseId: params.warehouseId ?? null,
  locationId: params.locationId ?? null,
  onHandQty: params.onHandQty,
  reservedQty: params.reservedQty,
  availableQty: params.availableQty,
});

export const toInventoryLotDto = (lot: InventoryLot): InventoryLotDto => ({
  id: lot.id,
  tenantId: lot.tenantId,
  productId: lot.productId,
  lotNumber: lot.lotNumber,
  mfgDate: toLocalDateString(lot.mfgDate),
  expiryDate: toLocalDateString(lot.expiryDate),
  receivedDate: lot.receivedDate as string,
  shipmentId: lot.shipmentId ?? null,
  supplierPartyId: lot.supplierPartyId ?? null,
  unitCostCents: lot.unitCostCents ?? null,
  qtyReceived: lot.qtyReceived,
  qtyOnHand: lot.qtyOnHand,
  qtyReserved: lot.qtyReserved,
  status: lot.status,
  notes: lot.notes ?? null,
  metadataJson: lot.metadataJson ?? null,
  createdAt: lot.createdAt.toISOString(),
  updatedAt: lot.updatedAt.toISOString(),
  archivedAt: lot.archivedAt ? lot.archivedAt.toISOString() : null,
});
