import type {
  ClassBillingMonthStatus,
  ClassAttendance,
  ClassEnrollment,
  ClassGroup,
  ClassMonthlyBillingRun,
  ClassSession,
  BillingPreviewOutput,
} from "@corely/contracts";
import type {
  BillingPreviewItem,
  ClassAttendanceEntity,
  ClassEnrollmentEntity,
  ClassGroupEntity,
  ClassMonthlyBillingRunEntity,
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
  startDate: entity.startDate ? entity.startDate.toISOString().slice(0, 10) : null,
  endDate: entity.endDate ? entity.endDate.toISOString().slice(0, 10) : null,
  isActive: entity.isActive,
  priceOverridePerSession: entity.priceOverridePerSession ?? null,
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

export const toBillingPreviewOutput = (input: {
  month: string;
  billingMonthStrategy: string;
  billingBasis: string;
  items: BillingPreviewItem[];
  generatedAt: Date;
}): BillingPreviewOutput => ({
  month: input.month,
  billingMonthStrategy: input.billingMonthStrategy as any,
  billingBasis: input.billingBasis as any,
  generatedAt: input.generatedAt.toISOString(),
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
