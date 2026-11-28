import { Injectable } from "@nestjs/common";
import {
  OperationalRequestReminderEvent,
  OperationalRequestReviewReminderType,
} from "@corely/contracts";
import { PublishNotificationUseCase } from "../../../../notifications/public";
import { OperationalRequestsUseCase } from "../../../../requests/public";
import type { EventHandler, OutboxEvent } from "./event-handler.interface";

@Injectable()
export class OperationalRequestReminderHandler implements EventHandler {
  readonly eventType = OperationalRequestReminderEvent;

  constructor(
    private readonly requests: OperationalRequestsUseCase,
    private readonly notifications: PublishNotificationUseCase
  ) {}

  handle(event: OutboxEvent): Promise<void> {
    return this.requests.deliverReminder(event.tenantId, event.payload, (request, tx) =>
      this.notifications.execute(
        {
          ...request.scope,
          recipientUserIds: [request.reviewerUserId],
          type: OperationalRequestReviewReminderType,
          severity: "info",
          title: "A request awaits review",
          resource: {
            module: "requests",
            entityType: "decision-inbox",
            entityId: request.scope.workspaceId,
            url: "/requests/inbox",
          },
          dedupeKey: `requests.review:${request.requestId}:${request.version}`,
          createdAt: new Date().toISOString(),
        },
        tx
      )
    );
  }
}
