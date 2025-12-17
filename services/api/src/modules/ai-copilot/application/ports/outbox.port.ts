export interface OutboxPort {
  enqueue(event: { tenantId: string; eventType: string; payloadJson: string }): Promise<void>;
}
