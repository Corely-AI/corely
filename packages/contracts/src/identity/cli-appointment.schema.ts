import {
  AppointmentReviewIdSchema,
  AppointmentReviewKeySchema,
} from "../approvals/appointment-review.schema";
import { OpenBukReplacementInputSchema } from "../booking/openbuk.schema";
import { CliGrantScopeSchema } from "./cli-agent.schema";
export {
  AppointmentReviewSchema,
  type AppointmentReview,
} from "../approvals/appointment-review.schema";

export const CliAppointmentProposalSchema = OpenBukReplacementInputSchema.extend({
  key: AppointmentReviewKeySchema,
}).strict();
export const CliAppointmentProposalRequestSchema = CliGrantScopeSchema.extend({
  proposal: CliAppointmentProposalSchema,
}).strict();
export const CliAppointmentReviewSelectorSchema = CliGrantScopeSchema.extend({
  reviewId: AppointmentReviewIdSchema,
}).strict();
export const CliAppointmentMessageDraftRequestSchema = CliAppointmentReviewSelectorSchema.extend({
  key: AppointmentReviewKeySchema,
  note: z.string().trim().max(1_000).default(""),
}).strict();

const selector = {
  type: "object",
  additionalProperties: false,
  required: ["reviewId"],
  properties: { reviewId: { type: "string", pattern: "^[a-f0-9]{64}$" } },
} as const;
export const CliAppointmentOperations = {
  propose: {
    id: "appointments.propose",
    description: "Propose one replacement for an appointment affected by an approved absence.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["bookingId", "startAt", "key"],
      properties: {
        bookingId: { type: "string", format: "uuid" },
        startAt: { type: "string", format: "date-time" },
        key: { type: "string" },
      },
    },
  },
  status: {
    id: "appointments.status",
    description: "Read the current status of an appointment replacement review.",
    inputSchema: selector,
  },
  apply: {
    id: "appointments.apply",
    description:
      "Apply the exact human-approved appointment replacement, or read the recorded result.",
    inputSchema: selector,
  },
} as const;
import { z } from "zod";
export const CliAppointmentMessageOperations = {
  draft: {
    id: "appointments.message.draft",
    description: "Draft a customer email for an applied appointment replacement.",
    inputSchema: {
      ...selector,
      required: ["reviewId", "key"],
      properties: {
        ...selector.properties,
        key: { type: "string" },
        note: { type: "string", maxLength: 1_000 },
      },
    },
  },
  status: {
    id: "appointments.message.status",
    description: "Read the separate email review and provider delivery status.",
    inputSchema: selector,
  },
  queue: {
    id: "appointments.message.queue",
    description: "Queue the exact approved email for background delivery.",
    inputSchema: selector,
  },
  retry: {
    id: "appointments.message.retry",
    description: "Retry an eligible failed delivery with the same provider idempotency key.",
    inputSchema: selector,
  },
} as const;
