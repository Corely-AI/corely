import type {
  ClockPort,
  IdGeneratorPort,
  LoggerPort,
  OutboxPort,
  UseCaseContext,
} from "@corely/kernel";
import { ValidationError } from "@corely/kernel";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { CatalogRepositoryPort, CatalogScope } from "../ports/catalog-repository.port";

export type CatalogUseCaseDeps = {
  logger: LoggerPort;
  repo: CatalogRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  audit: AuditPort;
  outbox: OutboxPort;
  idempotency: IdempotencyStoragePort;
};

export const scopeFromContext = (ctx: UseCaseContext): CatalogScope => {
  if (!ctx.tenantId) {
    throw new ValidationError("tenantId is required");
  }
  if (!ctx.workspaceId) {
    throw new ValidationError("workspaceId is required");
  }
  return { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
};
