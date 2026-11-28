import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { AppointmentDeliveryUseCase } from "../../../../notifications/public/appointment-delivery";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";

const openBukBookingCreated = z.object({
  workspaceId: z.string().min(1),
  bookingId: z.string().uuid(),
  source: z.literal("openbuk"),
  status: z.literal("CONFIRMED"),
});

@Injectable()
export class OpenBukBookingCreatedHandler implements EventHandler {
  readonly eventType = "booking.created";

  constructor(private readonly deliveries: AppointmentDeliveryUseCase) {}

  async handle(event: OutboxEvent) {
    const parsed = openBukBookingCreated.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    const { workspaceId, bookingId } = parsed.data;
    await this.deliveries.enqueueConfirmation({ tenantId: event.tenantId, workspaceId }, bookingId);
  }
}
