import { z } from "zod";
import { OpenBukReplacementSchema } from "../booking/openbuk.schema";
import {
  AppointmentUpdateMessageSchema,
  AppointmentDeliveryStatusSchema,
} from "../notifications/appointment-delivery.schema";

export const AppointmentReviewIdSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const AppointmentReviewKeySchema = z.string().regex(/^[\w-]{16,128}$/);
const reviewState = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
  "stale",
  "applied",
  "failed",
]);
export const AppointmentReviewDecisionSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    digest: AppointmentReviewIdSchema,
  })
  .strict();
export type AppointmentReviewDecision = z.infer<typeof AppointmentReviewDecisionSchema>;

export const AppointmentReviewResultSchema = z
  .object({
    bookingId: z.string().uuid(),
    bookingVersion: z.string().datetime(),
    deliveryId: AppointmentReviewIdSchema.optional(),
  })
  .strict();
export const AppointmentReviewSchema = z
  .object({
    id: AppointmentReviewIdSchema,
    digest: AppointmentReviewIdSchema,
    state: reviewState,
    expiresAt: z.string().datetime(),
    reviewPath: z.string(),
    reviewedAt: z.string().datetime().nullable(),
    result: AppointmentReviewResultSchema.nullable(),
    failureCode: z.enum(["booking-changed", "delivery-stale", "temporary-failure"]).nullable(),
    action: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("replacement"), payload: OpenBukReplacementSchema }).strict(),
      z
        .object({
          kind: z.literal("message"),
          parentReviewId: AppointmentReviewIdSchema,
          payload: AppointmentUpdateMessageSchema,
        })
        .strict(),
    ]),
    delivery: AppointmentDeliveryStatusSchema.optional(),
  })
  .strict();
export type AppointmentReview = z.infer<typeof AppointmentReviewSchema>;
