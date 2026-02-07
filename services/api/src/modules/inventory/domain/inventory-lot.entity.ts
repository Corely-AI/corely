import type { LocalDate } from "@corely/kernel";
import type { InventoryLotStatus } from "./inventory.types";

export type InventoryLotProps = {
  id: string;
  tenantId: string;
  productId: string;
  lotNumber: string;
  mfgDate?: LocalDate | null;
  expiryDate?: LocalDate | null;
  receivedDate: LocalDate;
  shipmentId?: string | null;
  supplierPartyId?: string | null;
  unitCostCents?: number | null;
  qtyReceived: number;
  qtyOnHand: number;
  qtyReserved: number;
  status: InventoryLotStatus;
  notes?: string | null;
  metadataJson?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
};

export type CreateInventoryLotProps = {
  id: string;
  tenantId: string;
  productId: string;
  lotNumber: string;
  mfgDate?: LocalDate | null;
  expiryDate?: LocalDate | null;
  receivedDate: LocalDate;
  shipmentId?: string | null;
  supplierPartyId?: string | null;
  unitCostCents?: number | null;
  qtyReceived: number;
  status?: InventoryLotStatus;
  notes?: string | null;
  metadataJson?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

export const createInventoryLot = (props: CreateInventoryLotProps): InventoryLotProps => {
  return {
    ...props,
    qtyOnHand: props.qtyReceived, // Initially, on-hand equals received
    qtyReserved: 0, // No reservations initially
    status: props.status ?? "AVAILABLE",
    archivedAt: null,
  };
};
