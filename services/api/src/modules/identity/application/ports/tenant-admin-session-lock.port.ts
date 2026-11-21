import type { TransactionContext } from "@corely/kernel";

export const TENANT_ADMIN_SESSION_LOCK = Symbol("identity.tenant-admin-session-lock");

export interface TenantAdminSessionLock {
  acquire(tenantId: string, sessionId: string, tx: TransactionContext): Promise<void>;
}
