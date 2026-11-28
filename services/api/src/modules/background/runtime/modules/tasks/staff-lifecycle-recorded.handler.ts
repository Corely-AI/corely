import { Logger } from "@nestjs/common";
import { z } from "zod";
import { StaffLifecycleEventTypeSchema, StaffLifecycleEventPayloadSchema } from "@corely/contracts";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";
class InvalidStaffLifecycleFact extends Error {
  readonly permanent = true;
}
const membershipPayload = z
  .object({ workspaceId: z.string().min(1), userId: z.string().min(1) })
  .strict();
class StaffLifecycleRecordedHandler implements EventHandler {
  private readonly logger = new Logger(StaffLifecycleRecordedHandler.name);
  constructor(readonly eventType: string) {}
  async handle(event: OutboxEvent): Promise<void> {
    const payload =
      this.eventType === "workspaces.member.disable"
        ? membershipPayload.safeParse(event.payload)
        : StaffLifecycleEventPayloadSchema.safeParse(event.payload);
    if (!payload.success || !event.tenantId || event.eventType !== this.eventType) {
      throw new InvalidStaffLifecycleFact("Invalid staff lifecycle fact");
    }
    this.logger.debug(
      JSON.stringify({
        event: event.eventType,
        eventId: event.id,
        tenantId: event.tenantId,
        ...payload.data,
      })
    );
  }
}
export function createStaffLifecycleEventHandlers(): EventHandler[] {
  return [...StaffLifecycleEventTypeSchema.options, "workspaces.member.disable"].map(
    (eventType) => new StaffLifecycleRecordedHandler(eventType)
  );
}
