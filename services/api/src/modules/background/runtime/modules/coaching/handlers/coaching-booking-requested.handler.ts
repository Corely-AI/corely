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
import { CoachingArtifactService } from "../../../../../coaching-engagements/infrastructure/documents/coaching-artifact.service";
import { COACHING_EVENTS, type CoachingBookingRequestedEvent } from "@corely/contracts";
import { buildSimplePdf } from "../../../../../coaching-engagements/domain/simple-pdf";
import { resolveLocalizedText } from "../../../../../coaching-engagements/domain/coaching-localization";
import {
  buildAbsoluteUrl,
  buildEmailMessage,
  buildLocalizedOfferTitle,
  maybeIssueMeetingLink,
} from "../coaching-workflow.helpers";
import {
  createCoachingAccessToken,
  hashCoachingAccessToken,
} from "../../../../../coaching-engagements/domain/coaching-tokens";

@Injectable()
export class CoachingBookingRequestedHandler implements EventHandler {
  readonly eventType = COACHING_EVENTS.BOOKING_REQUESTED;

  constructor(
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter,
    private readonly artifactService: CoachingArtifactService,
    @Inject(CUSTOMER_QUERY_PORT) private readonly customerQuery: CustomerQueryPort,
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    private readonly env: EnvService
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as CoachingBookingRequestedEvent;
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
    const title = buildLocalizedOfferTitle(engagement);
    if (engagement.offer.contractRequired) {
      const now = this.clock.now();
      const contractTemplate = engagement.offer.contractTemplate
        ? resolveLocalizedText(engagement.offer.contractTemplate, engagement.locale, engagement.offer.localeDefault)
        : null;
      const contractBody = contractTemplate ?? "No contract template has been configured.";
      let contractRequest = await this.repo.findLatestContractRequestByEngagement(
        event.tenantId,
        engagement.id
      );

      if (!contractRequest) {
        const token = createCoachingAccessToken();
        const draft = await this.artifactService.createPdfArtifact({
          tenantId: event.tenantId,
          title: `${title} Contract Draft`,
          objectPath: `engagements/${engagement.id}/contracts`,
          links: [
            { entityType: "COACHING_ENGAGEMENT", entityId: engagement.id },
            { entityType: "PARTY", entityId: engagement.clientPartyId },
          ],
          bytes: buildSimplePdf([
            `${title} contract draft`,
            `Engagement: ${engagement.id}`,
            `Client party: ${engagement.clientPartyId}`,
            `Template locale: ${engagement.locale}`,
            "Contract body:",
            contractBody,
            `Generated at: ${now.toISOString()}`,
          ]),
        });

        contractRequest = await this.repo.createContractRequest({
          id: this.idGenerator.newId(),
          tenantId: event.tenantId,
          workspaceId: payload.workspaceId,
          engagementId: engagement.id,
          clientPartyId: engagement.clientPartyId,
          provider: "corely-internal",
          status: "pending",
          requestToken: token,
          requestTokenHash: hashCoachingAccessToken(token),
          templateLocale: engagement.locale,
          contractTitle: title,
          contractBody,
          recipientName: customer?.displayName ?? null,
          recipientEmail: customer?.email ?? null,
          signerName: null,
          signerEmail: null,
          requestedAt: now,
          deliveredAt: null,
          viewedAt: null,
          completedAt: null,
          draftDocumentId: draft.documentId,
          signedDocumentId: null,
          createdAt: now,
          updatedAt: now,
        });

        await this.repo.createTimelineEntry({
          id: this.idGenerator.newId(),
          tenantId: event.tenantId,
          workspaceId: payload.workspaceId,
          engagementId: engagement.id,
          eventType: COACHING_EVENTS.CONTRACT_SIGNATURE_REQUESTED,
          stateFrom: engagement.status,
          stateTo: engagement.status,
          actorUserId: null,
          metadata: {
            requestId: contractRequest.id,
            draftDocumentId: contractRequest.draftDocumentId,
            recipientEmail: contractRequest.recipientEmail,
          },
          occurredAt: now,
          createdAt: now,
        });
        await this.outbox.enqueue({
          tenantId: event.tenantId,
          eventType: COACHING_EVENTS.CONTRACT_SIGNATURE_REQUESTED,
          correlationId: event.correlationId ?? undefined,
          payload: {
            workspaceId: payload.workspaceId,
            engagementId: engagement.id,
            requestId: contractRequest.id,
            draftDocumentId: contractRequest.draftDocumentId,
          },
        });
      }

      if (
        engagement.contractDraftDocumentId !== contractRequest.draftDocumentId ||
        engagement.contractAccessTokenHash !== contractRequest.requestTokenHash ||
        engagement.contractRequestedAt?.getTime() !== contractRequest.requestedAt.getTime()
      ) {
        engagement.contractDraftDocumentId = contractRequest.draftDocumentId;
        engagement.contractAccessTokenHash = contractRequest.requestTokenHash;
        engagement.contractRequestedAt = contractRequest.requestedAt;
        engagement.updatedAt = now;
        await this.repo.updateEngagement(engagement);
      }

      if (customer?.email) {
        const signUrl = buildAbsoluteUrl(
          this.env.API_BASE_URL ?? "http://localhost:3000",
          `/coaching/public/contracts/${engagement.id}/${contractRequest.requestToken}`
        );
        if (!contractRequest.deliveredAt || contractRequest.recipientEmail !== customer.email) {
          const message = buildEmailMessage({
            heading: "Please sign your coaching agreement",
            body: [
              `Your coaching booking "${title}" is waiting for contract signature.`,
              "Please review and sign the agreement to continue the confirmation flow.",
            ],
            ctaLabel: "Open agreement",
            ctaUrl: signUrl,
          });
          await this.emailSender.sendEmail({
            tenantId: event.tenantId,
            to: [customer.email],
            subject: "Please sign your coaching agreement",
            html: message.html,
            text: message.text,
            idempotencyKey: `coaching-contract-request:${engagement.id}:${contractRequest.id}`,
          });
          await this.repo.updateContractRequest({
            ...contractRequest,
            recipientName: customer.displayName ?? contractRequest.recipientName,
            recipientEmail: customer.email,
            deliveredAt: contractRequest.deliveredAt ?? this.clock.now(),
            updatedAt: this.clock.now(),
          });
        }
      }
    }

    if (!engagement.offer.paymentRequired && !engagement.offer.contractRequired) {
      const session = await this.repo.findSessionById(
        event.tenantId,
        payload.workspaceId,
        payload.sessionId
      );
      if (!session) {
        return;
      }
      if (engagement.offer.prepFormTemplate) {
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
      if (customer?.email) {
        const message = buildEmailMessage({
          heading: "Your coaching session is confirmed",
          body: [`Your meeting link for "${title}" is ready.`, `Meeting link: ${meetingLink}`],
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
}
