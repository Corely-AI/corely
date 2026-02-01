import { type ClockPort, type IdGeneratorPort, type LoggerPort } from "@corely/kernel";
import type { PurchasingAccountMappingRepositoryPort } from "../ports/account-mapping-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

export type MappingDeps = {
  logger: LoggerPort;
  mappingRepo: PurchasingAccountMappingRepositoryPort;
  idempotency: IdempotencyStoragePort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

export const buildMapping = (params: {
  id: string;
  tenantId: string;
  supplierPartyId: string;
  categoryKey: string;
  glAccountId: string;
  now: Date;
}) => ({
  id: params.id,
  tenantId: params.tenantId,
  supplierPartyId: params.supplierPartyId,
  categoryKey: params.categoryKey,
  glAccountId: params.glAccountId,
  createdAt: params.now,
  updatedAt: params.now,
});
