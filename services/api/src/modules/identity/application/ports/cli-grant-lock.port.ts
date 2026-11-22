import type { TransactionContext } from "@corely/kernel";

export const CLI_GRANT_LOCK = Symbol("identity.cli-grant-lock");

export interface CliGrantLock {
  acquire(key: string, transaction: TransactionContext): Promise<void>;
}
