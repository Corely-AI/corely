import { Inject, Injectable } from "@nestjs/common";
import {
  CUSTOMER_QUERY_PORT,
  type CustomerQueryPort,
} from "../../../../../party/application/ports/customer-query.port";
import {
  EMAIL_SENDER_PORT,
  OUTBOX_PORT,
  ID_GENERATOR_TOKEN,
  CLOCK_PORT_TOKEN,
  type ClockPort,
  type EmailSenderPort,
  type IdGeneratorPort,
  type OutboxPort,
} from "@corely/kernel";
import { EnvService } from "@corely/config";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { PrismaCoachingEngagementRepositoryAdapter } from "../../../../../coaching-engagements/infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { COACHING_EVENTS, type CoachingPrepFormSubmittedEvent } from "@corely/contracts";
import {
  buildEmailMessage,
  buildLocalizedOfferTitle,
  maybeIssueMeetingLink,
} from "../coaching-workflow.helpers";

@Injectable()
export class CoachingPrepFormSubmittedHandler implements EventHandler {
  readonly eventType = COACHING_EVENTS.PREP_FORM_SUBMITTED;

  constructor(
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter,
    @Inject(CUSTOMER_QUERY_PORT) private readonly customerQuery: CustomerQueryPort,
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    private readonly env: EnvService
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as CoachingPrepFormSubmittedEvent;
    const session = await this.repo.findSessionById(
      event.tenantId,
      payload.workspaceId,
      payload.sessionId
    );
    if (!session) {
      return;
    }

    if (
      session.engagement.paymentStatus !== "captured" ||
      session.engagement.contractStatus !== "signed"
    ) {
      return;
    }

    const meetingLink = await maybeIssueMeetingLink({
      baseUrl: this.env.API_BASE_URL ?? "http://localhost:3000",
      repo: this.repo,
      outbox: this.outbox,
      idGenerator: this.idGenerator,
      clock: this.clock,
      tenantId: event.tenantId,
      workspaceId: payload.workspaceId,
      correlationId: event.correlationId,
      engagement: session.engagement,
      session,
    });

    const customer = await this.customerQuery.getCustomerBillingSnapshot(
      event.tenantId,
      session.engagement.clientPartyId
    );
    if (customer?.email) {
      const message = buildEmailMessage({
        heading: "Your coaching session is ready",
        body: [
          `Prep is complete for "${buildLocalizedOfferTitle(session.engagement)}".`,
          `Meeting link: ${meetingLink}`,
        ],
      });
      await this.emailSender.sendEmail({
        tenantId: event.tenantId,
        to: [customer.email],
        subject: "Your coaching session is ready",
        html: message.html,
        text: message.text,
        idempotencyKey: `coaching-meeting:${session.engagement.id}:${session.id}`,
      });
    }
  }
}
