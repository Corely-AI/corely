import { Injectable } from "@nestjs/common";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { COACHING_EVENTS, type CoachingPrepFormRequestedEvent } from "@corely/contracts";
import { PrepFormDispatchService } from "../services/prep-form-dispatch.service";

@Injectable()
export class CoachingPrepFormRequestedHandler implements EventHandler {
  readonly eventType = COACHING_EVENTS.PREP_FORM_REQUESTED;

  constructor(private readonly prepDispatch: PrepFormDispatchService) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as CoachingPrepFormRequestedEvent;
    await this.prepDispatch.dispatchIfDue({
      tenantId: event.tenantId,
      workspaceId: payload.workspaceId,
      sessionId: payload.sessionId,
    });
  }
}
