import { TransactionContext } from "./unit-of-work.port";

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

export const OUTBOX_PORT = Symbol("OUTBOX_PORT");
