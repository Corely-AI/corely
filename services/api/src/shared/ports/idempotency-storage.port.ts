import type { TransactionContext } from "@corely/kernel";

export interface StoredResponse {
  statusCode?: number;
  body: any;
}

export interface IdempotencyStoragePort {
  get(
    actionKey: string,
    tenantId: string | null,
    key: string,
    tx?: TransactionContext
  ): Promise<StoredResponse | null>;
  store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: StoredResponse,
    tx?: TransactionContext
  ): Promise<void>;
}

export const IDEMPOTENCY_STORAGE_PORT_TOKEN = "api/idempotency-storage-port";
