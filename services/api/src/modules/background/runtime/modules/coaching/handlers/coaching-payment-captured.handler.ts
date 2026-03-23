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
  isErr,
  type ClockPort,
  type EmailSenderPort,
  type IdGeneratorPort,
  type OutboxPort,
} from "@corely/kernel";
import { EnvService } from "@corely/config";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { PrismaCoachingEngagementRepositoryAdapter } from "../../../../../coaching-engagements/infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import type {
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingPaymentRecord,
} from "../../../../../coaching-engagements/domain/coaching.types";
import { InvoicesApplication } from "../../../../../invoices/application/invoices.application";
import { PrismaInvoiceRepoAdapter } from "../../../../../invoices/infrastructure/adapters/prisma-invoice-repository.adapter";
import { toInvoiceDto } from "../../../../../invoices/application/use-cases/shared/invoice-dto.mapper";
import { DocumentsApplication } from "../../../../../documents/application/documents.application";
import { COACHING_EVENTS, type CoachingPaymentCapturedEvent, type InvoiceDto } from "@corely/contracts";
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
    private readonly invoices: InvoicesApplication,
    private readonly invoiceRepo: PrismaInvoiceRepoAdapter,
    private readonly documents: DocumentsApplication,
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
    if (!engagement) {
      return;
    }

    const customer = await this.customerQuery.getCustomerBillingSnapshot(
      event.tenantId,
      engagement.clientPartyId
    );
    const payment = await this.repo.findLatestPaymentByEngagement(event.tenantId, engagement.id);
    if (!payment || payment.status !== "captured") {
      return;
    }

    await this.ensureInvoiceIssued({
      event,
      payload,
      engagement,
      payment,
      customerEmail: customer?.email ?? null,
    });

    if (engagement.contractStatus !== "signed") {
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

  private async ensureInvoiceIssued(params: {
    event: OutboxEvent;
    payload: CoachingPaymentCapturedEvent;
    engagement: CoachingEngagementRecord & { offer: CoachingOfferRecord };
    payment: CoachingPaymentRecord;
    customerEmail: string | null;
  }) {
    const { event, payload, engagement, payment, customerEmail } = params;
    const appCtx = {
      tenantId: event.tenantId,
      workspaceId: payload.workspaceId,
      userId: "system",
      correlationId: event.correlationId ?? undefined,
      requestId: `coaching:${engagement.id}:invoice`,
    };
    const paymentMarker = `coaching-payment:${payment.id}`;
    const title = buildLocalizedOfferTitle(engagement);
    console.log("[coaching-invoice] ensure start", {
      engagementId: engagement.id,
      invoiceId: engagement.invoiceId,
      workspaceId: payload.workspaceId,
      paymentId: payment.id,
      paymentStatus: payment.status,
    });

    let invoice: InvoiceDto | null = null;
    if (engagement.invoiceId) {
      const existingById = await this.invoices.getInvoiceById.execute(
        { invoiceId: engagement.invoiceId },
        appCtx
      );
      if (!isErr(existingById)) {
        invoice = existingById.value.invoice;
      }
    }

    if (!invoice) {
      const existing = await this.invoiceRepo.findBySource(
        payload.workspaceId,
        "coaching_engagement",
        engagement.id
      );
      if (existing) {
        console.log("[coaching-invoice] found existing by source", {
          engagementId: engagement.id,
          invoiceId: existing.id,
        });
        invoice = toInvoiceDto(existing);
      }
    }

    let invoiceCreated = false;
    if (!invoice) {
      console.log("[coaching-invoice] creating invoice", {
        engagementId: engagement.id,
        clientPartyId: engagement.clientPartyId,
      });
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
      if (isErr(created)) {
        console.log("[coaching-invoice] create failed", created.error);
        throw created.error;
      }
      invoice = created.value.invoice;
      invoiceCreated = true;
      console.log("[coaching-invoice] created", {
        engagementId: engagement.id,
        invoiceId: invoice.id,
      });
    }

    if (engagement.invoiceId !== invoice.id) {
      console.log("[coaching-invoice] linking invoice on engagement", {
        engagementId: engagement.id,
        invoiceId: invoice.id,
      });
      engagement.invoiceId = invoice.id;
      engagement.updatedAt = this.clock.now();
      await this.repo.updateEngagement(engagement);
    }

    if (invoice.status === "DRAFT") {
      console.log("[coaching-invoice] finalizing", {
        engagementId: engagement.id,
        invoiceId: invoice.id,
      });
      const finalized = await this.invoices.finalizeInvoice.execute({ invoiceId: invoice.id }, appCtx);
      if (isErr(finalized)) {
        console.log("[coaching-invoice] finalize failed", finalized.error);
        throw finalized.error;
      }
      invoice = finalized.value.invoice;
    }

    const pdf = await this.documents.getInvoicePdf.execute({ invoiceId: invoice.id, waitMs: 0 }, appCtx);
    if (!isErr(pdf) && pdf.value.documentId) {
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

    if (!(invoice.payments ?? []).some((entry) => entry.note === paymentMarker)) {
      console.log("[coaching-invoice] recording payment", {
        engagementId: engagement.id,
        invoiceId: invoice.id,
        paymentMarker,
      });
      const recorded = await this.invoices.recordPayment.execute(
        {
          invoiceId: invoice.id,
          amountCents: payment.amountCents,
          paidAt: payment.capturedAt?.toISOString() ?? this.clock.now().toISOString(),
          note: paymentMarker,
        },
        appCtx
      );
      if (isErr(recorded)) {
        console.log("[coaching-invoice] record payment failed", recorded.error);
        throw recorded.error;
      }
      invoice = recorded.value.invoice;
    }

    if (customerEmail) {
      console.log("[coaching-invoice] sending invoice", {
        engagementId: engagement.id,
        invoiceId: invoice.id,
        customerEmail,
      });
      const sent = await this.invoices.sendInvoice.execute(
        {
          invoiceId: invoice.id,
          to: customerEmail,
          attachPdf: true,
          locale: engagement.locale,
          idempotencyKey: `coaching-invoice-auto:${engagement.id}:${invoice.id}`,
        },
        appCtx
      );
      if (isErr(sent)) {
        console.log("[coaching-invoice] send failed", sent.error);
        throw sent.error;
      }
    }

    if (invoiceCreated) {
      await this.outbox.enqueue({
        tenantId: event.tenantId,
        eventType: COACHING_EVENTS.INVOICE_ISSUED,
        correlationId: event.correlationId ?? undefined,
        payload: {
          workspaceId: payload.workspaceId,
          engagementId: engagement.id,
          invoiceId: invoice.id,
        },
      });
    }
  }
}
