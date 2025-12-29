import type { PurchaseOrderAggregate } from "../../domain/purchase-order.aggregate";
import type { PurchaseOrderStatus } from "../../domain/purchasing.types";

export type ListPurchaseOrdersFilters = {
  status?: PurchaseOrderStatus;
  supplierPartyId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
};

export type ListPurchaseOrdersResult = {
  items: PurchaseOrderAggregate[];
  nextCursor?: string | null;
};

export interface PurchaseOrderRepositoryPort {
  findById(tenantId: string, purchaseOrderId: string): Promise<PurchaseOrderAggregate | null>;
  list(tenantId: string, filters: ListPurchaseOrdersFilters): Promise<ListPurchaseOrdersResult>;
  save(tenantId: string, purchaseOrder: PurchaseOrderAggregate): Promise<void>;
  create(tenantId: string, purchaseOrder: PurchaseOrderAggregate): Promise<void>;
  isPoNumberTaken(tenantId: string, poNumber: string): Promise<boolean>;
}

export const PURCHASE_ORDER_REPO = Symbol("PURCHASE_ORDER_REPO");
