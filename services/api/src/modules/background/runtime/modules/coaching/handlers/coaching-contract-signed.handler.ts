import { Inject, Injectable } from "@nestjs/common";
import {
  CUSTOMER_QUERY_PORT,
  type CustomerQueryPort,
} from "../../../../../party/application/ports/customer-query.port";
import {
  EMAIL_SENDER_PORT,
  OUTBOX_PORT,
  type EmailSenderPort,
  type OutboxPort,
} from "@corely/kernel";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { PrismaCoachingEngagementRepositoryAdapter } from "../../../../../coaching-engagements/infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { CoachingArtifactService } from "../../../../../coaching-engagements/infrastructure/documents/coaching-artifact.service";
import { COACHING_EVENTS, type CoachingContractSignedEvent } from "@corely/contracts";
import { buildEmailMessage } from "../coaching-workflow.helpers";

@Injectable()
export class CoachingContractSignedHandler implements EventHandler {
  readonly eventType = COACHING_EVENTS.CONTRACT_SIGNED;

  constructor(
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter,
    private readonly artifactService: CoachingArtifactService,
    @Inject(CUSTOMER_QUERY_PORT) private readonly customerQuery: CustomerQueryPort,
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as CoachingContractSignedEvent;
    const engagement = await this.repo.findEngagementById(
      event.tenantId,
      payload.workspaceId,
      payload.engagementId
    );
    if (!engagement) {
      return;
    }

    const customer = await this.customerQuery.getCustomerBillingSnapshot(
      event.tenantId,
      engagement.clientPartyId
    );
    if (customer?.email) {
      const attachment = await this.artifactService.createSignedDownloadAttachment({
        tenantId: event.tenantId,
        documentId: payload.documentId,
        filename: `Signed-Contract-${engagement.id}.pdf`,
      });
      const message = buildEmailMessage({
        heading: "Your signed coaching agreement",
        body: ["A copy of the signed coaching agreement is attached for your records."],
      });
      await this.emailSender.sendEmail({
        tenantId: event.tenantId,
        to: [customer.email],
        subject: "Your signed coaching agreement",
        html: message.html,
        text: message.text,
        attachments: [attachment],
        idempotencyKey: `coaching-contract-signed:${engagement.id}:${payload.documentId}`,
      });
    }

    if (engagement.paymentStatus !== "captured") {
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
    }
  }
}
