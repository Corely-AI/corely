import { Injectable } from "@nestjs/common";
import { OutboxRepository } from "@corely/data";
import {
  NOTIFICATION_EVENTS,
  NotificationIntentPayload,
  NotificationIntentPayloadSchema,
} from "@corely/contracts";
import { randomUUID } from "crypto";

@Injectable()
export class NotificationEmitterService {
  constructor(private readonly outbox: OutboxRepository) {}

  async emitIntent(payload: NotificationIntentPayload): Promise<void> {
    // Validate payload
    const data = NotificationIntentPayloadSchema.parse(payload);

    await this.outbox.enqueue({
      tenantId: data.tenantId,
      eventType: NOTIFICATION_EVENTS.INTENT,
      payload: data,
      // Correlation ID could be dedupeKey or random
      correlationId: data.dedupeKey ?? randomUUID(),
    });
  }
}
