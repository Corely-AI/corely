import {
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type AuditPort,
} from "@corely/kernel";
import type { VendorBillRepositoryPort } from "../ports/vendor-bill-repository.port";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import type { PurchasingAccountMappingRepositoryPort } from "../ports/account-mapping-repository.port";
import type { SupplierQueryPort } from "../ports/supplier-query.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { AccountingApplication } from "../../../accounting/application/accounting.application";
import type { VendorBillLineItem } from "../../domain/purchasing.types";

export type VendorBillDeps = {
  logger: LoggerPort;
  repo: VendorBillRepositoryPort;
  settingsRepo: PurchasingSettingsRepositoryPort;
  mappingRepo: PurchasingAccountMappingRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  supplierQuery: SupplierQueryPort;
  accounting: AccountingApplication;
  audit: AuditPort;
};

export const resolveAccountForLine = async (params: {
  line: VendorBillLineItem;
  tenantId: string;
  supplierPartyId: string;
  mappingRepo: PurchasingAccountMappingRepositoryPort;
  defaultExpenseAccountId?: string | null;
}): Promise<string | null> => {
  if (params.line.glAccountId) {
    return params.line.glAccountId;
  }
  if (params.line.category) {
    const mapping = await params.mappingRepo.findBySupplierCategory(
      params.tenantId,
      params.supplierPartyId,
      params.line.category
    );
    if (mapping) {
      return mapping.glAccountId;
    }
  }
  return params.defaultExpenseAccountId ?? null;
};
