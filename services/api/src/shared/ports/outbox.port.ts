export interface OutboxPort {
  enqueue(event: {
    eventType: string;
    payload: any;
    tenantId: string;
    correlationId?: string;
  }): Promise<void>;
}

export const OUTBOX_PORT_TOKEN = Symbol("OUTBOX_PORT_TOKEN");
