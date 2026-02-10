import type { LocalDate } from "@corely/kernel";
import type { InventoryLotProps } from "../../domain/inventory-lot.entity";
import type { InventoryLotStatus } from "../../domain/inventory.types";

export type InventoryLot = InventoryLotProps;

export type ListLotsFilter = {
  productId?: string;
  status?: InventoryLotStatus;
  expiryBefore?: LocalDate;
  expiryAfter?: LocalDate;
  shipmentId?: string;
  supplierPartyId?: string;
  qtyOnHandGt?: number;
  limit?: number;
  offset?: number;
};

export type ExpiryItem = {
  lotId: string;
  lotNumber: string;
  productId: string;
  productName?: string;
  expiryDate: LocalDate | null;
  qtyOnHand: number;
  daysUntilExpiry: number;
};

export const INVENTORY_LOT_REPO = "inventory/inventory-lot-repository";

export interface InventoryLotRepositoryPort {
  create(tenantId: string, lot: InventoryLot): Promise<void>;
  findById(tenantId: string, lotId: string): Promise<InventoryLot | null>;
  findByLotNumber(
    tenantId: string,
    productId: string,
    lotNumber: string
  ): Promise<InventoryLot | null>;
  list(tenantId: string, filter: ListLotsFilter): Promise<{ lots: InventoryLot[]; total: number }>;
  getExpirySummary(
    tenantId: string,
    days: number
  ): Promise<{ expiringSoon: ExpiryItem[]; expired: ExpiryItem[] }>;
}
