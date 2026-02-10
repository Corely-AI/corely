import type {
  ClassAttendanceEntity,
  ClassBillingInvoiceLinkEntity,
  ClassEnrollmentEntity,
  ClassGroupEntity,
  ClassMonthlyBillingRunEntity,
  ClassSessionEntity,
} from "../../domain/entities/classes.entities";

export const toClassGroup = (row: any): ClassGroupEntity => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  name: row.name,
  subject: row.subject,
  level: row.level,
  defaultPricePerSession: row.defaultPricePerSession,
  currency: row.currency,
  schedulePattern: row.schedulePattern ?? null,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toClassSession = (row: any): ClassSessionEntity => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  classGroupId: row.classGroupId,
  startsAt: row.startsAt,
  endsAt: row.endsAt ?? null,
  topic: row.topic ?? null,
  notes: row.notes ?? null,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toClassEnrollment = (row: any): ClassEnrollmentEntity => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  classGroupId: row.classGroupId,
  studentClientId: row.studentClientId,
  payerClientId: row.payerClientId,
  startDate: row.startDate ?? null,
  endDate: row.endDate ?? null,
  isActive: row.isActive,
  priceOverridePerSession: row.priceOverridePerSession ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toClassAttendance = (row: any): ClassAttendanceEntity => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  sessionId: row.sessionId,
  enrollmentId: row.enrollmentId,
  status: row.status,
  billable: row.billable,
  note: row.note ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toBillingRun = (row: any): ClassMonthlyBillingRunEntity => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  month: row.month,
  billingMonthStrategy: row.billingMonthStrategy,
  billingBasis: row.billingBasis,
  billingSnapshot: row.billingSnapshot ?? null,
  status: row.status,
  runId: row.runId,
  generatedAt: row.generatedAt ?? null,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toBillingInvoiceLink = (row: any): ClassBillingInvoiceLinkEntity => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  billingRunId: row.billingRunId,
  payerClientId: row.payerClientId,
  invoiceId: row.invoiceId,
  idempotencyKey: row.idempotencyKey,
  createdAt: row.createdAt,
});
