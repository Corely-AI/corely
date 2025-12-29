import type { VendorBillAggregate } from "../../domain/vendor-bill.aggregate";
import type { VendorBillStatus } from "../../domain/purchasing.types";

export type ListVendorBillsFilters = {
  status?: VendorBillStatus;
  supplierPartyId?: string;
  fromDate?: string;
  toDate?: string;
  dueFromDate?: string;
  dueToDate?: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
};

export type ListVendorBillsResult = {
  items: VendorBillAggregate[];
  nextCursor?: string | null;
};

export interface VendorBillRepositoryPort {
  findById(tenantId: string, vendorBillId: string): Promise<VendorBillAggregate | null>;
  list(tenantId: string, filters: ListVendorBillsFilters): Promise<ListVendorBillsResult>;
  create(tenantId: string, vendorBill: VendorBillAggregate): Promise<void>;
  save(tenantId: string, vendorBill: VendorBillAggregate): Promise<void>;
  findBySupplierBillNumber(
    tenantId: string,
    supplierPartyId: string,
    billNumber: string
  ): Promise<VendorBillAggregate | null>;
}

export const VENDOR_BILL_REPO = Symbol("VENDOR_BILL_REPO");
