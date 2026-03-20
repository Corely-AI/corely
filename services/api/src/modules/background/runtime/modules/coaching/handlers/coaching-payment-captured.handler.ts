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
import { COACHING_EVENTS, type CoachingPaymentCapturedEvent } from "@corely/contracts";
import {
  buildEmailMessage,
  buildLocalizedOfferTitle,
  maybeIssueMeetingLink,
} from "../coaching-workflow.helpers";

@Injectable()
export class CoachingPaymentCapturedHandler implements EventHandler {
  readonly eventType = COACHING_EVENTS.PAYMENT_CAPTURED;

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
    const payload = event.payload as CoachingPaymentCapturedEvent;
    const engagement = await this.repo.findEngagementById(
      event.tenantId,
      payload.workspaceId,
      payload.engagementId
    );
    if (!engagement || engagement.contractStatus !== "signed") {
      return;
    }

    const sessions = await this.repo.listSessions(
      event.tenantId,
      payload.workspaceId,
      { engagementId: engagement.id },
      { page: 1, pageSize: 1 }
    );
    const session = sessions.items[0];
    if (!session) {
      return;
    }

    if (engagement.offer.prepFormTemplate && !session.prepRequestedAt) {
      await this.outbox.enqueue({
        tenantId: event.tenantId,
        eventType: COACHING_EVENTS.PREP_FORM_REQUESTED,
        correlationId: event.correlationId ?? undefined,
        payload: {
          workspaceId: payload.workspaceId,
          engagementId: engagement.id,
          sessionId: session.id,
        },
      });
      return;
    }

    if (engagement.offer.prepFormTemplate && !session.prepSubmittedAt) {
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
      engagement,
      session,
    });

    const customer = await this.customerQuery.getCustomerBillingSnapshot(
      event.tenantId,
      engagement.clientPartyId
    );
    if (customer?.email) {
      const message = buildEmailMessage({
        heading: "Your coaching session is confirmed",
        body: [
          `Payment and signature checks are complete for "${buildLocalizedOfferTitle(engagement)}".`,
          `Meeting link: ${meetingLink}`,
        ],
      });
      await this.emailSender.sendEmail({
        tenantId: event.tenantId,
        to: [customer.email],
        subject: "Your coaching session is confirmed",
        html: message.html,
        text: message.text,
        idempotencyKey: `coaching-meeting:${engagement.id}:${session.id}`,
      });
    }
  }
}
