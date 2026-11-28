import {
  ProcedurePublicationEventPayloadSchema,
  ProcedurePublicationEventTypeSchema,
} from "@corely/contracts";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";

class InvalidPublicationEvent extends Error {
  readonly permanent = true;
}

export function createProcedurePublicationHandlers(): EventHandler[] {
  return ProcedurePublicationEventTypeSchema.options.map((eventType) => ({
    eventType,
    async handle(event: OutboxEvent) {
      if (
        !event.tenantId ||
        event.eventType !== eventType ||
        !ProcedurePublicationEventPayloadSchema.safeParse(event.payload).success
      ) {
        throw new InvalidPublicationEvent("Invalid knowledge publication event");
      }
      // The private collection reads current state directly. Acknowledge the recorded fact.
    },
  }));
}
