import { IOutboxPort } from "../../application/ports/outbox.port";

export class MockOutbox implements IOutboxPort {
  events: Array<{ tenantId: string; eventType: string; payloadJson: string }> = [];

  async enqueue(data: { tenantId: string; eventType: string; payloadJson: string }): Promise<void> {
    this.events.push(data);
  }
}
