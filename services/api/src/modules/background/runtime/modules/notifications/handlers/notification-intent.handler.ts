import { Injectable } from "@nestjs/common";
import { NOTIFICATION_EVENTS } from "@corely/contracts";
import { PublishNotificationUseCase } from "../../../../../notifications/public";
import type { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";

@Injectable()
export class NotificationIntentHandler implements EventHandler {
  readonly eventType = NOTIFICATION_EVENTS.INTENT;

  constructor(private readonly publisher: PublishNotificationUseCase) {}

  handle(event: OutboxEvent): Promise<void> {
    return this.publisher.execute(event.payload);
  }
}
