import { OutboxPort } from "../../../shared/ports/outbox.port";

export class FakeOutbox implements OutboxPort {
  events: any[] = [];
  async enqueue(event: any): Promise<void> {
    this.events.push(event);
  }
}
