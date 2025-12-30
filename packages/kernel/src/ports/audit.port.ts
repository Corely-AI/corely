import { type TransactionContext } from "./unit-of-work.port";

export interface AuditPort {
  log(
    entry: {
      tenantId: string;
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, any>;
    },
    tx?: TransactionContext
  ): Promise<void>;
}

export { AUDIT_PORT } from "../tokens";
