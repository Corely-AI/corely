import { Inject, Injectable } from "@nestjs/common";
import { InvoicesApplication } from "../../../../../invoices/application/invoices.application";
import { DocumentsApplication } from "../../../../../documents/application/documents.application";
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
    private readonly invoices: InvoicesApplication,
    private readonly documents: DocumentsApplication,
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
    const appCtx = {
      tenantId: event.tenantId,
      workspaceId: payload.workspaceId,
      userId: "system",
      correlationId: event.correlationId ?? undefined,
      requestId: `coaching:${engagement.id}`,
    };

    if (engagement.offer.paymentRequired && !engagement.invoiceId) {
      const created = await this.invoices.createInvoice.execute(
        {
          customerPartyId: engagement.clientPartyId,
          currency: engagement.offer.currency,
          legalEntityId: engagement.legalEntityId ?? undefined,
          paymentMethodId: engagement.paymentMethodId ?? undefined,
          sourceType: "coaching_engagement",
          sourceId: engagement.id,
          notes: `Coaching engagement ${engagement.id}`,
          lineItems: [{ description: title, qty: 1, unitPriceCents: engagement.offer.priceCents }],
        },
        appCtx
      );
      if ("value" in created) {
        const invoiceId = created.value.invoice.id;
        engagement.invoiceId = invoiceId;
        engagement.updatedAt = this.clock.now();
        await this.repo.updateEngagement(engagement);
        await this.invoices.finalizeInvoice.execute({ invoiceId }, appCtx);
        if (customer?.email) {
          await this.invoices.sendInvoice.execute(
            {
              invoiceId,
              to: customer.email,
              attachPdf: true,
              locale: engagement.locale,
            },
            appCtx
          );
        }
        const pdf = await this.documents.getInvoicePdf.execute({ invoiceId, waitMs: 0 }, appCtx);
        if ("value" in pdf && pdf.value.documentId) {
          await this.documents.linkDocument.execute(
            {
              documentId: pdf.value.documentId,
              entityType: "COACHING_ENGAGEMENT",
              entityId: engagement.id,
            },
            appCtx
          );
          await this.documents.linkDocument.execute(
            {
              documentId: pdf.value.documentId,
              entityType: "PARTY",
              entityId: engagement.clientPartyId,
            },
            appCtx
          );
        }
        await this.outbox.enqueue({
          tenantId: event.tenantId,
          eventType: COACHING_EVENTS.INVOICE_ISSUED,
          correlationId: event.correlationId ?? undefined,
          payload: { workspaceId: payload.workspaceId, engagementId: engagement.id, invoiceId },
        });
      }
    }

    if (engagement.offer.contractRequired && !engagement.contractDraftDocumentId) {
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
          `Generated at: ${new Date().toISOString()}`,
        ]),
      });

      engagement.contractDraftDocumentId = draft.documentId;
      engagement.contractAccessTokenHash = hashCoachingAccessToken(token);
      engagement.contractRequestedAt = this.clock.now();
      engagement.updatedAt = this.clock.now();
      await this.repo.updateEngagement(engagement);

      if (customer?.email) {
        const signUrl = buildAbsoluteUrl(
          this.env.API_BASE_URL ?? "http://localhost:3000",
          `/coaching/public/contracts/${engagement.id}/${token}/sign`
        );
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
          idempotencyKey: `coaching-contract-request:${engagement.id}`,
        });
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
