import { Injectable } from "@nestjs/common";
import { SsoEmailCodeEventSchema } from "@corely/contracts";
import { DeliverSsoEmailCodeUseCase } from "../../../../identity";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";

@Injectable()
export class SsoEmailCodeRequestedHandler implements EventHandler {
  readonly eventType = "identity.sso.email_code_requested";
  constructor(private readonly deliver: DeliverSsoEmailCodeUseCase) {}
  async handle(event: OutboxEvent) {
    await this.deliver.execute(SsoEmailCodeEventSchema.parse(event.payload).challengeId);
  }
}
// These transactionally recorded authentication facts have no background business effect.
export function createSsoRecordedEventHandlers(): EventHandler[] {
  return [
    "identity.sso.signed_in",
    "identity.sso.handoff_issued",
    "identity.sso.app_session_created",
  ].map((eventType) => ({ eventType, handle: async () => {} }));
}
