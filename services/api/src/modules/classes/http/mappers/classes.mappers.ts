import type {
  BillingPreviewOutput,
  ClassAttendance,
  ClassBillingMonthStatus,
  ClassBillingInvoiceLink,
  ClassEnrollment,
  ClassEnrollmentBillingPlan,
  ClassGroup,
  ClassGroupInstructor,
  ClassGroupResource,
  ClassMilestone,
  ClassMilestoneCompletion,
  ClassMonthlyBillingRun,
  ClassProgram,
  ClassProgramMilestoneTemplate,
  ClassProgramSessionTemplate,
  ClassSession,
} from "@corely/contracts";
import type {
  BillingPreviewItem,
  ClassAttendanceEntity,
  ClassBillingInvoiceLinkEntity,
  ClassEnrollmentBillingPlanEntity,
  ClassEnrollmentEntity,
  ClassGroupEntity,
  ClassGroupInstructorEntity,
  ClassGroupResourceEntity,
  ClassMilestoneCompletionEntity,
  ClassMilestoneEntity,
  ClassMonthlyBillingRunEntity,
  ClassProgramEntity,
  ClassProgramMilestoneTemplateEntity,
  ClassProgramSessionTemplateEntity,
  ClassSessionEntity,
} from "../../domain/entities/classes.entities";

export const toClassGroupDto = (entity: ClassGroupEntity): ClassGroup => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  name: entity.name,
  subject: entity.subject,
  level: entity.level,
  defaultPricePerSession: entity.defaultPricePerSession,
  currency: entity.currency,
  schedulePattern: entity.schedulePattern ?? null,
  status: entity.status,
  kind: entity.kind,
  lifecycle: entity.lifecycle,
  startAt: entity.startAt ? entity.startAt.toISOString() : null,
  endAt: entity.endAt ? entity.endAt.toISOString() : null,
  timezone: entity.timezone,
  capacity: entity.capacity ?? null,
  waitlistEnabled: entity.waitlistEnabled,
  deliveryMode: entity.deliveryMode,
  communityUrl: entity.communityUrl ?? null,
  programId: entity.programId ?? null,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toClassGroupInstructorDto = (
  entity: ClassGroupInstructorEntity
): ClassGroupInstructor => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  classGroupId: entity.classGroupId,
  partyId: entity.partyId,
  role: entity.role,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toProgramDto = (entity: ClassProgramEntity): ClassProgram => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  title: entity.title,
  description: entity.description ?? null,
  levelTag: entity.levelTag ?? null,
  expectedSessionsCount: entity.expectedSessionsCount ?? null,
  defaultTimezone: entity.defaultTimezone ?? null,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toProgramSessionTemplateDto = (
  entity: ClassProgramSessionTemplateEntity
): ClassProgramSessionTemplate => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  programId: entity.programId,
  index: entity.index,
  title: entity.title ?? null,
  defaultDurationMin: entity.defaultDurationMin ?? null,
  type: entity.type,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toProgramMilestoneTemplateDto = (
  entity: ClassProgramMilestoneTemplateEntity
): ClassProgramMilestoneTemplate => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  programId: entity.programId,
  title: entity.title,
  type: entity.type,
  required: entity.required,
  index: entity.index,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toClassSessionDto = (
  entity: ClassSessionEntity & { billingMonthStatus: ClassBillingMonthStatus }
): ClassSession => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  classGroupId: entity.classGroupId,
  startsAt: entity.startsAt.toISOString(),
  endsAt: entity.endsAt ? entity.endsAt.toISOString() : null,
  topic: entity.topic ?? null,
  notes: entity.notes ?? null,
  status: entity.status,
  type: entity.type,
  meetingProvider: entity.meetingProvider ?? null,
  meetingJoinUrl: entity.meetingJoinUrl ?? null,
  meetingExternalId: entity.meetingExternalId ?? null,
  billingMonthStatus: entity.billingMonthStatus,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toEnrollmentDto = (entity: ClassEnrollmentEntity): ClassEnrollment => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  classGroupId: entity.classGroupId,
  studentClientId: entity.studentClientId,
  payerClientId: entity.payerClientId,
  payerPartyId: entity.payerPartyId ?? null,
  status: entity.status,
  seatType: entity.seatType,
  source: entity.source,
  startDate: entity.startDate ? entity.startDate.toISOString().slice(0, 10) : null,
  endDate: entity.endDate ? entity.endDate.toISOString().slice(0, 10) : null,
  isActive: entity.isActive,
  priceOverridePerSession: entity.priceOverridePerSession ?? null,
  priceCents: entity.priceCents ?? null,
  currency: entity.currency ?? null,
  discountCents: entity.discountCents ?? null,
  discountLabel: entity.discountLabel ?? null,
  placementLevel: entity.placementLevel ?? null,
  placementGoal: entity.placementGoal ?? null,
  placementNote: entity.placementNote ?? null,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toEnrollmentBillingPlanDto = (
  entity: ClassEnrollmentBillingPlanEntity
): ClassEnrollmentBillingPlan => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  enrollmentId: entity.enrollmentId,
  type: entity.type,
  scheduleJson: entity.scheduleJson,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toMilestoneDto = (entity: ClassMilestoneEntity): ClassMilestone => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  classGroupId: entity.classGroupId,
  programMilestoneTemplateId: entity.programMilestoneTemplateId ?? null,
  title: entity.title,
  type: entity.type,
  dueAt: entity.dueAt ? entity.dueAt.toISOString() : null,
  required: entity.required,
  index: entity.index ?? null,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toMilestoneCompletionDto = (
  entity: ClassMilestoneCompletionEntity
): ClassMilestoneCompletion => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  milestoneId: entity.milestoneId,
  enrollmentId: entity.enrollmentId,
  status: entity.status,
  score: entity.score ?? null,
  feedback: entity.feedback ?? null,
  gradedByPartyId: entity.gradedByPartyId ?? null,
  gradedAt: entity.gradedAt ? entity.gradedAt.toISOString() : null,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toResourceDto = (entity: ClassGroupResourceEntity): ClassGroupResource => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  classGroupId: entity.classGroupId,
  type: entity.type,
  title: entity.title,
  documentId: entity.documentId ?? null,
  url: entity.url ?? null,
  visibility: entity.visibility,
  sortOrder: entity.sortOrder,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toAttendanceDto = (entity: ClassAttendanceEntity): ClassAttendance => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  sessionId: entity.sessionId,
  enrollmentId: entity.enrollmentId,
  status: entity.status,
  billable: entity.billable,
  note: entity.note ?? null,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toBillingRunDto = (entity: ClassMonthlyBillingRunEntity): ClassMonthlyBillingRun => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  month: entity.month,
  billingMonthStrategy: entity.billingMonthStrategy,
  billingBasis: entity.billingBasis,
  billingSnapshot: entity.billingSnapshot ?? null,
  status: entity.status,
  runId: entity.runId,
  generatedAt: entity.generatedAt ? entity.generatedAt.toISOString() : null,
  createdByUserId: entity.createdByUserId,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toBillingInvoiceLinkDto = (
  entity: ClassBillingInvoiceLinkEntity
): ClassBillingInvoiceLink => ({
  id: entity.id,
  tenantId: entity.tenantId,
  workspaceId: entity.workspaceId,
  billingRunId: entity.billingRunId ?? null,
  enrollmentId: entity.enrollmentId ?? null,
  payerClientId: entity.payerClientId,
  classGroupId: entity.classGroupId ?? null,
  invoiceId: entity.invoiceId,
  idempotencyKey: entity.idempotencyKey,
  purpose: entity.purpose,
  createdAt: entity.createdAt.toISOString(),
});

export const toBillingPreviewOutput = (input: {
  month: string;
  billingMonthStrategy: string;
  billingBasis: string;
  billingRunStatus: string | null;
  items: BillingPreviewItem[];
  invoiceLinks?: {
    payerClientId: string;
    classGroupId?: string | null;
    enrollmentId?: string | null;
    invoiceId: string;
    purpose?: string;
    invoiceStatus?: "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED" | null;
  }[];
  invoicesSentAt?: string | null;
  invoiceSendProgress?: {
    expectedInvoiceCount: number;
    processedInvoiceCount: number;
    pendingCount: number;
    queuedCount: number;
    sentCount: number;
    deliveredCount: number;
    delayedCount: number;
    failedCount: number;
    bouncedCount: number;
    isComplete: boolean;
    hasFailures: boolean;
  } | null;
  generatedAt: Date;
}): BillingPreviewOutput => ({
  month: input.month,
  billingMonthStrategy: input.billingMonthStrategy as any,
  billingBasis: input.billingBasis as any,
  billingRunStatus: input.billingRunStatus as any,
  generatedAt: input.generatedAt.toISOString(),
  invoiceLinks: input.invoiceLinks?.map((link) => ({
    payerClientId: link.payerClientId,
    classGroupId: link.classGroupId ?? null,
    enrollmentId: link.enrollmentId ?? null,
    invoiceId: link.invoiceId,
    purpose: link.purpose as any,
    invoiceStatus: link.invoiceStatus ?? null,
  })),
  invoicesSentAt: input.invoicesSentAt ?? null,
  invoiceSendProgress: input.invoiceSendProgress ?? null,
  items: input.items.map((item) => ({
    payerClientId: item.payerClientId,
    totalSessions: item.totalSessions,
    totalAmountCents: item.totalAmountCents,
    currency: item.currency,
    lines: item.lines.map((line) => ({
      classGroupId: line.classGroupId,
      sessions: line.sessions,
      priceCents: line.priceCents,
      amountCents: line.amountCents,
    })),
  })),
});
