import { z } from "zod";
import { BillingMonthSchema } from "./billing.schema";
import { ClassGroupLifecycleSchema } from "./classes.types";

export const ClassesMonthlyInvoicesGeneratedEventSchema = z.object({
  tenantId: z.string(),
  month: BillingMonthSchema,
  billingRunId: z.string(),
  invoiceIds: z.array(z.string()),
});
export type ClassesMonthlyInvoicesGeneratedEvent = z.infer<
  typeof ClassesMonthlyInvoicesGeneratedEventSchema
>;

export const ClassesInvoiceReadyToSendEventSchema = z.object({
  tenantId: z.string(),
  invoiceId: z.string(),
});
export type ClassesInvoiceReadyToSendEvent = z.infer<typeof ClassesInvoiceReadyToSendEventSchema>;

export const ClassEntityEventEnvelopeSchema = z.object({
  tenantId: z.string(),
  workspaceId: z.string(),
  classGroupId: z.string().optional(),
  enrollmentId: z.string().optional(),
  programId: z.string().optional(),
  milestoneId: z.string().optional(),
  resourceId: z.string().optional(),
  invoiceId: z.string().optional(),
  at: z.string(),
});
export type ClassEntityEventEnvelope = z.infer<typeof ClassEntityEventEnvelopeSchema>;

export const ClassesCohortLifecycleChangedEventSchema = ClassEntityEventEnvelopeSchema.extend({
  fromLifecycle: ClassGroupLifecycleSchema,
  toLifecycle: ClassGroupLifecycleSchema,
});
export type ClassesCohortLifecycleChangedEvent = z.infer<
  typeof ClassesCohortLifecycleChangedEventSchema
>;

export const CLASSES_EVENT_NAMES = {
  COHORT_PUBLISHED: "classes.cohort.published",
  COHORT_STARTED: "classes.cohort.started",
  COHORT_ENDED: "classes.cohort.ended",
  COHORT_TEAM_UPDATED: "classes.cohort.team_updated",
  ENROLLMENT_APPLIED: "classes.enrollment.applied",
  ENROLLMENT_APPROVED: "classes.enrollment.approved",
  ENROLLMENT_UPDATED: "classes.enrollment.updated",
  ENROLLMENT_BILLING_PLAN_UPDATED: "classes.enrollment.billing_plan_updated",
  INVOICE_GENERATED: "classes.invoice.generated",
  INVOICE_READY_TO_SEND: "classes.invoice.ready_to_send",
  MILESTONE_CREATED: "classes.milestone.created",
  MILESTONE_UPDATED: "classes.milestone.updated",
  MILESTONE_DELETED: "classes.milestone.deleted",
  MILESTONE_COMPLETION_UPDATED: "classes.milestone.completion_updated",
  RESOURCE_CREATED: "classes.resource.created",
  RESOURCE_UPDATED: "classes.resource.updated",
  RESOURCE_DELETED: "classes.resource.deleted",
} as const;
