import type { OutboxPort } from "@corely/kernel";

export class MockOutbox implements OutboxPort {
  events: Array<{ tenantId: string; eventType: string; payload: unknown }> = [];

  async enqueue(data: { tenantId: string; eventType: string; payload: unknown }): Promise<void> {
    this.events.push(data);
  }
}
