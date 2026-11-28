import { z } from "zod";
import { OpenBukReplacementInputSchema, OpenBukReplacementSchema } from "../booking/openbuk.schema";
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

export const AppointmentReviewResultSchema = z.union([
  z
    .object({
      bookingId: z.string().uuid(),
      bookingVersion: z.string().datetime(),
      deliveryId: AppointmentReviewIdSchema.optional(),
    })
    .strict(),
  z.object({ taskId: z.string().uuid(), taskVersion: z.number().int().positive() }).strict(),
]);
export const AppointmentReviewSchema = z
  .object({
    id: AppointmentReviewIdSchema,
    digest: AppointmentReviewIdSchema,
    state: reviewState,
    expiresAt: z.string().datetime(),
    reviewPath: z.string(),
    reviewedAt: z.string().datetime().nullable(),
    result: AppointmentReviewResultSchema.nullable(),
    failureCode: z
      .enum(["booking-changed", "delivery-stale", "task-changed", "temporary-failure"])
      .nullable(),
    action: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("replacement"), payload: OpenBukReplacementSchema }).strict(),
      z
        .object({
          kind: z.literal("task"),
          payload: z
            .object({
              taskId: z.string().uuid(),
              title: z.string(),
              owner: z.string(),
              version: z.number().int().positive(),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("message"),
          parentReviewId: AppointmentReviewIdSchema.optional(),
          payload: AppointmentUpdateMessageSchema,
        })
        .strict(),
    ]),
    delivery: AppointmentDeliveryStatusSchema.optional(),
  })
  .strict();
export type AppointmentReview = z.infer<typeof AppointmentReviewSchema>;

export const OperationalReviewActionInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("replacement"), request: OpenBukReplacementInputSchema }).strict(),
  z.object({ kind: z.literal("task"), taskId: z.string().uuid() }).strict(),
  z
    .object({
      kind: z.literal("message"),
      replacementId: AppointmentReviewIdSchema,
      note: z.string().trim().max(1000).default(""),
      scheduledFor: z.string().datetime().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("confirmation"),
      bookingId: z.string().uuid(),
      note: z.string().trim().max(1000).default(""),
      scheduledFor: z.string().datetime().optional(),
    })
    .strict(),
]);
export const OperationalPlanRequestSchema = z
  .object({
    key: AppointmentReviewKeySchema,
    actions: z.array(OperationalReviewActionInputSchema).min(1).max(10),
  })
  .strict();
export const OperationalPlanResponseSchema = z
  .object({
    actions: z.array(
      z.union([
        z
          .object({ index: z.number().int().nonnegative(), review: AppointmentReviewSchema })
          .strict(),
        z
          .object({
            index: z.number().int().nonnegative(),
            error: z.enum(["action-unavailable", "temporarily-unavailable"]),
          })
          .strict(),
      ])
    ),
  })
  .strict();
export type OperationalPlanResponse = z.infer<typeof OperationalPlanResponseSchema>;
