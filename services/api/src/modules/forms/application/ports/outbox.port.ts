import type { TransactionContext } from "@corely/kernel";

export interface OutboxPort {
  enqueue(
    event: {
      eventType: string;
      payload: any;
      tenantId: string;
      correlationId?: string;
      availableAt?: Date;
    },
    tx?: TransactionContext
  ): Promise<void>;
}

export const OUTBOX_PORT = "forms/outbox-port";
