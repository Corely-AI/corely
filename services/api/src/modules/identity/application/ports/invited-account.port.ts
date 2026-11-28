import type { TransactionContext } from "@corely/kernel";
export const INVITED_ACCOUNT_PORT = Symbol("INVITED_ACCOUNT_PORT");
export interface InvitedAccountPort {
  ensureTenantMember(
    tenantId: string,
    userId: string,
    tx: TransactionContext,
    allowCreate: boolean
  ): Promise<boolean>;
}
