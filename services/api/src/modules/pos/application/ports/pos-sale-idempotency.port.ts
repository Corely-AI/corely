import type { SyncPosSaleOutput } from "@kerniflow/contracts";

export const POS_SALE_IDEMPOTENCY_PORT = Symbol("POS_SALE_IDEMPOTENCY_PORT");

export interface PosSaleIdempotencyPort {
  /**
   * Get cached sync result by idempotency key
   */
  get(workspaceId: string, idempotencyKey: string): Promise<SyncPosSaleOutput | null>;

  /**
   * Store sync result with idempotency key
   */
  store(
    workspaceId: string,
    idempotencyKey: string,
    posSaleId: string,
    result: SyncPosSaleOutput
  ): Promise<void>;
}
