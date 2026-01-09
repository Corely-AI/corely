import type { PurchasingAccountMapping } from "../../domain/purchasing.types";

export interface PurchasingAccountMappingRepositoryPort {
  findBySupplierCategory(
    tenantId: string,
    supplierPartyId: string,
    categoryKey: string
  ): Promise<PurchasingAccountMapping | null>;
  list(tenantId: string, supplierPartyId?: string): Promise<PurchasingAccountMapping[]>;
  upsert(mapping: PurchasingAccountMapping): Promise<PurchasingAccountMapping>;
}

export const PURCHASING_ACCOUNT_MAPPING_REPO = "purchasing/account-mapping-repository";
