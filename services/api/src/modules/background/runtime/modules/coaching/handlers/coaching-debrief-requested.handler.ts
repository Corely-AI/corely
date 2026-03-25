import { Inject, Injectable } from "@nestjs/common";
import {
  CUSTOMER_QUERY_PORT,
  type CustomerQueryPort,
} from "../../../../../party/application/ports/customer-query.port";
import { EMAIL_SENDER_PORT, type ClockPort, type EmailSenderPort } from "@corely/kernel";
import { CLOCK_PORT_TOKEN } from "@corely/kernel";
import { EnvService } from "@corely/config";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { PrismaCoachingEngagementRepositoryAdapter } from "../../../../../coaching-engagements/infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { COACHING_EVENTS, type CoachingDebriefRequestedEvent } from "@corely/contracts";
import {
  createCoachingAccessToken,
  hashCoachingAccessToken,
} from "../../../../../coaching-engagements/domain/coaching-tokens";
import { buildAbsoluteUrl, buildEmailMessage } from "../coaching-workflow.helpers";

@Injectable()
export class CoachingDebriefRequestedHandler implements EventHandler {
  readonly eventType = COACHING_EVENTS.DEBRIEF_REQUESTED;

  constructor(
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter,
    @Inject(CUSTOMER_QUERY_PORT) private readonly customerQuery: CustomerQueryPort,
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    private readonly env: EnvService
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as CoachingDebriefRequestedEvent;
    const session = await this.repo.findSessionById(
      event.tenantId,
      payload.workspaceId,
      payload.sessionId
    );
    if (!session || session.debriefRequestedAt || !session.engagement.offer.debriefTemplate) {
      return;
    }

    const token = createCoachingAccessToken();
    session.debriefAccessTokenHash = hashCoachingAccessToken(token);
    session.debriefRequestedAt = this.clock.now();
    session.updatedAt = this.clock.now();
    await this.repo.updateSession(session);

    const customer = await this.customerQuery.getCustomerBillingSnapshot(
      event.tenantId,
      session.engagement.clientPartyId
    );
    if (!customer?.email) {
      return;
    }

    const formUrl = buildAbsoluteUrl(
      this.env.API_BASE_URL ?? "http://localhost:3000",
      `/coaching/public/debrief/${session.id}/${token}`
    );
    const message = buildEmailMessage({
      heading: "Complete your coaching debrief",
      body: ["Your session is complete. Please share your feedback and debrief notes."],
      ctaLabel: "Open debrief form",
      ctaUrl: formUrl,
    });

    await this.emailSender.sendEmail({
      tenantId: event.tenantId,
      to: [customer.email],
      subject: "Complete your coaching debrief",
      html: message.html,
      text: message.text,
      idempotencyKey: `coaching-debrief-request:${session.id}`,
    });
  }
}
