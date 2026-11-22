import { APPOINTMENT_DELIVERY_REQUESTED, AppointmentDeliveryEventSchema } from "@corely/contracts";
import { EMAIL_SENDER_PORT, type EmailSenderPort } from "@corely/kernel";
import { Inject, Injectable } from "@nestjs/common";
import { AppointmentDeliveryUseCase } from "../../../../notifications/public/appointment-delivery";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";

@Injectable()
export class AppointmentDeliveryHandler implements EventHandler {
  readonly eventType = APPOINTMENT_DELIVERY_REQUESTED;

  constructor(
    private readonly deliveries: AppointmentDeliveryUseCase,
    @Inject(EMAIL_SENDER_PORT) private readonly email: EmailSenderPort
  ) {}

  async handle(event: OutboxEvent) {
    const { workspaceId, deliveryId } = AppointmentDeliveryEventSchema.parse(event.payload);
    await this.deliveries.dispatch(
      { tenantId: event.tenantId, workspaceId },
      deliveryId,
      this.email
    );
  }
}
