import { Injectable, Logger, Inject } from "@nestjs/common";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { OutboxRepository, PrismaClassesRepository } from "@corely/data";
import { ClassesInvoiceReadyToSendEventSchema, EVENT_NAMES } from "@corely/contracts";
import { InvoiceEmailRequestedPayload } from "../../invoices/invoice-email-requested.handler";
import { PrismaInvoiceEmailDeliveryAdapter } from "@corely/data";
import {
  UNIT_OF_WORK,
  type UnitOfWorkPort,
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "@corely/kernel";

@Injectable()
export class ClassesInvoiceReadyToSendHandler implements EventHandler {
  readonly eventType = "classes.invoice.ready_to_send";
  private readonly logger = new Logger(ClassesInvoiceReadyToSendHandler.name);

  constructor(
    private readonly repo: PrismaClassesRepository,
    private readonly deliveryRepo: PrismaInvoiceEmailDeliveryAdapter,
    private readonly outbox: OutboxRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const valid = ClassesInvoiceReadyToSendEventSchema.safeParse(event.payload);
    if (!valid.success) {
      this.logger.error(
        `Invalid payload for ${this.eventType}: ${JSON.stringify(valid.error.flatten())}`
      );
      return;
    }
    const { tenantId, invoiceId } = valid.data;

    // Consistency check: payload vs envelope
    if (tenantId !== event.tenantId) {
      this.logger.error(
        `Payload tenantId ${tenantId} does not match event tenantId ${event.tenantId}`
      );
      return;
    }

    // Idempotency: Use event.id as the idempotency key for the delivery record.
    // This prevents re-processing the same outbox event, but allows re-sending if a new event is emitted.
    const idempotencyKey = event.id;

    // Fast-path: Check if delivery already exists (avoids extra work)
    const existing = await this.deliveryRepo.findByIdempotencyKey(tenantId, idempotencyKey);
    if (existing) {
      this.logger.log(`Delivery already exists for event ${event.id}. Skipping.`);
      return;
    }

    // 1. Fetch invoice data using shared repo (read-only first)
    const invoice = await this.repo.findInvoiceForEmail(tenantId, invoiceId);

    if (!invoice) {
      this.logger.warn(`Invoice ${invoiceId} not found. Skipping email.`);
      return;
    }

    if (!invoice.customerEmail) {
      this.logger.warn(`Invoice ${invoiceId} has no customer email. Skipping.`);
      return;
    }

    try {
      await this.uow.withinTransaction(async (tx) => {
        // 2. Create Delivery Record (QUEUED) inside transaction
        // This acts as our atomic idempotency guarantee.
        const delivery = await this.deliveryRepo.create({
          id: this.idGenerator.newId(),
          tenantId,
          invoiceId,
          to: invoice.customerEmail!,
          idempotencyKey,
          provider: "resend",
          status: "QUEUED",
        });

        // 3. Enqueue Email Request inside transaction
        // Either both happen, or neither, ensuring no orphan delivery records.
        const emailPayload: InvoiceEmailRequestedPayload = {
          deliveryId: delivery.id,
          invoiceId,
          to: invoice.customerEmail!,
          idempotencyKey: `send-${delivery.id}`,
          locale: invoice.customerLocale ?? "en",
        };

        await this.outbox.enqueue(
          {
            tenantId,
            eventType: "invoice.email.requested", // Ideally import from Contracts if available
            payload: emailPayload,
            correlationId: event.correlationId ?? event.id,
          },
          tx
        );

        this.logger.log(
          `Enqueued email request for invoice ${invoiceId} (delivery ${delivery.id})`
        );
      });
    } catch (e: any) {
      // Check for unique constraint violation (P2002) - means another worker handled it concurrently
      if (e.code === "P2002" || (e.message && e.message.includes("P2002"))) {
        this.logger.log(`Delivery created concurrently for event ${event.id}. Skipping.`);
        return;
      }
      throw e;
    }
  }
}
