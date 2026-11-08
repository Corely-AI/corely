import { Logger } from "@nestjs/common";
import { EmployeeTaskEventPayloadSchema, EmployeeTaskEventTypeSchema } from "@corely/contracts";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";

type TaskEventType = (typeof EmployeeTaskEventTypeSchema.options)[number];
class InvalidTaskEventError extends Error {
  readonly permanent = true;
}

class EmployeeTaskRecordedHandler implements EventHandler {
  private readonly logger = new Logger(EmployeeTaskRecordedHandler.name);
  constructor(readonly eventType: TaskEventType) {}
  async handle(event: OutboxEvent): Promise<void> {
    const parsed = EmployeeTaskEventPayloadSchema.safeParse(event.payload);
    if (!event.tenantId || event.eventType !== this.eventType || !parsed.success) {
      throw new InvalidTaskEventError("Invalid employee task lifecycle fact");
    }
    // TASK-01 has no external notification or workflow side effect. Acknowledge these
    // recorded facts, retaining the outbox history instead of dead-lettering valid writes.
    // Future delivery consumers must replace/extend this handler explicitly.
    this.logger.debug(
      JSON.stringify({
        event: event.eventType,
        eventId: event.id,
        tenantId: event.tenantId,
        ...parsed.data,
      })
    );
  }
}
export function createEmployeeTaskEventHandlers(): EventHandler[] {
  return EmployeeTaskEventTypeSchema.options.map((type) => new EmployeeTaskRecordedHandler(type));
}
