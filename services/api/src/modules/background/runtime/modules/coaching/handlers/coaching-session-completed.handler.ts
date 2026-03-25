import { Inject, Injectable } from "@nestjs/common";
import { OUTBOX_PORT, type OutboxPort } from "@corely/kernel";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { PrismaCoachingEngagementRepositoryAdapter } from "../../../../../coaching-engagements/infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { COACHING_EVENTS, type CoachingSessionCompletedEvent } from "@corely/contracts";

@Injectable()
export class CoachingSessionCompletedHandler implements EventHandler {
  readonly eventType = COACHING_EVENTS.SESSION_COMPLETED;

  constructor(
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as CoachingSessionCompletedEvent;
    const session = await this.repo.findSessionById(
      event.tenantId,
      payload.workspaceId,
      payload.sessionId
    );
    if (!session || !session.engagement.offer.debriefTemplate || session.debriefRequestedAt) {
      return;
    }

    await this.outbox.enqueue({
      tenantId: event.tenantId,
      eventType: COACHING_EVENTS.DEBRIEF_REQUESTED,
      correlationId: event.correlationId ?? undefined,
      payload: {
        workspaceId: payload.workspaceId,
        engagementId: session.engagement.id,
        sessionId: session.id,
      },
    });
  }
}
