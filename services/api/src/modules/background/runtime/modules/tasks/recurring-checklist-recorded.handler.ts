import { Logger } from "@nestjs/common";
import { ChecklistEventPayloadSchema, ChecklistEventTypeSchema } from "@corely/contracts";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";
class InvalidChecklistFact extends Error {
  readonly permanent = true;
}
class ChecklistRecordedHandler implements EventHandler {
  private readonly logger = new Logger(ChecklistRecordedHandler.name);
  constructor(readonly eventType: (typeof ChecklistEventTypeSchema.options)[number]) {}
  async handle(event: OutboxEvent): Promise<void> {
    const payload = ChecklistEventPayloadSchema.safeParse(event.payload);
    if (!payload.success || !event.tenantId || event.eventType !== this.eventType) {
      throw new InvalidChecklistFact("Invalid checklist lifecycle fact");
    }
    this.logger.debug(
      JSON.stringify({
        event: event.eventType,
        tenantId: event.tenantId,
        eventId: event.id,
        ...payload.data,
      })
    );
  }
}
export function createChecklistEventHandlers(): EventHandler[] {
  return ChecklistEventTypeSchema.options.map((type) => new ChecklistRecordedHandler(type));
}
