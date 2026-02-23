import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { EnvService } from "@corely/config";
import {
  DIRECTORY_EVENT_TYPES,
  DirectoryLeadCreatedEventSchema,
  type DirectoryLeadCreatedEvent,
} from "@corely/contracts";
import {
  EMAIL_SENDER_PORT,
  IDEMPOTENCY_PORT,
  type EmailSenderPort,
  type IdempotencyPort,
} from "@corely/kernel";
import type { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";

@Injectable()
export class DirectoryLeadCreatedHandler implements EventHandler {
  readonly eventType = DIRECTORY_EVENT_TYPES.LEAD_CREATED;
  private readonly logger = new Logger(DirectoryLeadCreatedHandler.name);

  constructor(
    private readonly env: EnvService,
    @Inject(IDEMPOTENCY_PORT) private readonly idempotency: IdempotencyPort,
    @Optional() @Inject(EMAIL_SENDER_PORT) private readonly emailSender?: EmailSenderPort
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = this.parsePayload(event);
    const idempotencyKey = `${this.eventType}:${event.id}`;

    await this.idempotency.run(idempotencyKey, async () => {
      this.logger.log(
        `Directory lead received: lead=${payload.leadId} restaurant=${payload.restaurantName} contact=${payload.contact}`
      );

      const notifyEmail = this.env.DIRECTORY_LEADS_NOTIFY_EMAIL;
      if (notifyEmail && this.emailSender) {
        await this.emailSender.sendEmail({
          tenantId: payload.tenantId,
          to: [notifyEmail],
          subject: `New directory lead: ${payload.restaurantName}`,
          text: [
            `Lead ID: ${payload.leadId}`,
            `Restaurant: ${payload.restaurantName} (${payload.restaurantSlug})`,
            `Name: ${payload.name}`,
            `Contact: ${payload.contact}`,
            "",
            "Message:",
            payload.message,
          ].join("\n"),
          idempotencyKey,
        });
      }

      return {
        leadId: payload.leadId,
        handledAt: new Date().toISOString(),
      };
    });
  }

  private parsePayload(event: OutboxEvent): DirectoryLeadCreatedEvent {
    const parsed = DirectoryLeadCreatedEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      throw new Error(`Invalid directory lead payload: ${parsed.error.message}`);
    }

    if (parsed.data.tenantId !== event.tenantId) {
      throw new Error(
        `Tenant mismatch for directory lead event: payload=${parsed.data.tenantId} envelope=${event.tenantId}`
      );
    }

    return parsed.data;
  }
}
