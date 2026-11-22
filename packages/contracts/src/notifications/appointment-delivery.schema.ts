import { z } from "zod";

export const APPOINTMENT_DELIVERY_REQUESTED = "notifications.appointment-update.requested";

export const AppointmentUpdateMessageSchema = z
  .object({
    bookingId: z.string().uuid(),
    bookingVersion: z.string().datetime(),
    recipient: z.string().email().max(320),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[^\r\n]+$/),
    body: z.string().trim().min(1).max(4_000),
  })
  .strict();
export type AppointmentUpdateMessage = z.infer<typeof AppointmentUpdateMessageSchema>;

export const AppointmentDeliveryEventSchema = z
  .object({
    workspaceId: z.string().min(1),
    deliveryId: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const AppointmentDeliveryStatusSchema = AppointmentDeliveryEventSchema.extend({
  bookingId: z.string().uuid(),
  state: z.enum(["pending", "accepted", "failed", "superseded"]),
  updatedAt: z.string().datetime(),
  attempts: z.number().int().nonnegative(),
  retryable: z.boolean(),
}).strict();
export type AppointmentDeliveryStatus = z.infer<typeof AppointmentDeliveryStatusSchema>;
