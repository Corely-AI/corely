import { Inject, Injectable } from "@nestjs/common";
import { EMAIL_SENDER_PORT, type EmailSenderPort } from "@corely/kernel";
import { CLIENT_UPDATE_EVENT, DeliverClientUpdateUseCase } from "../../../../issues";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";

@Injectable()
export class IssueClientUpdateHandler implements EventHandler {
  readonly eventType = CLIENT_UPDATE_EVENT;

  constructor(
    @Inject(EMAIL_SENDER_PORT) private readonly sender: EmailSenderPort,
    private readonly deliver: DeliverClientUpdateUseCase
  ) {}

  async handle(event: OutboxEvent) {
    const payload = event.payload as { workspaceId?: string; issueId?: string };
    if (!event.tenantId || !payload?.workspaceId || !payload.issueId) {return;}
    await this.deliver.execute(event.tenantId, payload.workspaceId, payload.issueId, this.sender);
  }
}
