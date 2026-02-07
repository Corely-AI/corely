import type {
  ClassAttendanceEntity,
  ClassBillingInvoiceLinkEntity,
  ClassEnrollmentEntity,
  ClassGroupEntity,
  ClassMonthlyBillingRunEntity,
  ClassSessionEntity,
} from "../../domain/entities/classes.entities";
import type { AttendanceBillingRow } from "../../domain/rules/billing.rules";

export type ListPagination = {
  page: number;
  pageSize: number;
};

export type ClassGroupListFilters = {
  q?: string;
  status?: ClassGroupEntity["status"];
  subject?: string;
  level?: string;
  sort?: string | string[];
  filters?: unknown;
};

export type SessionListFilters = {
  q?: string;
  classGroupId?: string;
  status?: ClassSessionEntity["status"];
  dateFrom?: Date;
  dateTo?: Date;
  sort?: string | string[];
  filters?: unknown;
};

export type EnrollmentListFilters = {
  q?: string;
  classGroupId?: string;
  studentClientId?: string;
  payerClientId?: string;
  isActive?: boolean;
  sort?: string | string[];
  filters?: unknown;
};

export type BillingPreviewFilters = {
  monthStart: Date;
  monthEnd: Date;
  classGroupId?: string;
  payerClientId?: string;
};

export interface ClassesRepositoryPort {
  createClassGroup(group: ClassGroupEntity): Promise<ClassGroupEntity>;
  updateClassGroup(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    updates: Partial<ClassGroupEntity>
  ): Promise<ClassGroupEntity>;
  findClassGroupById(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassGroupEntity | null>;
  listClassGroups(
    tenantId: string,
    workspaceId: string,
    filters: ClassGroupListFilters,
    pagination: ListPagination
  ): Promise<{ items: ClassGroupEntity[]; total: number }>;
  listClassGroupsWithSchedulePattern(
    tenantId: string,
    workspaceId: string
  ): Promise<ClassGroupEntity[]>;

  createSession(session: ClassSessionEntity): Promise<ClassSessionEntity>;
  upsertSession(session: ClassSessionEntity): Promise<ClassSessionEntity>;
  updateSession(
    tenantId: string,
    workspaceId: string,
    sessionId: string,
    updates: Partial<ClassSessionEntity>
  ): Promise<ClassSessionEntity>;
  findSessionById(
    tenantId: string,
    workspaceId: string,
    sessionId: string
  ): Promise<ClassSessionEntity | null>;
  listSessions(
    tenantId: string,
    workspaceId: string,
    filters: SessionListFilters,
    pagination: ListPagination
  ): Promise<{ items: ClassSessionEntity[]; total: number }>;

  upsertEnrollment(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    studentClientId: string,
    data: ClassEnrollmentEntity
  ): Promise<ClassEnrollmentEntity>;
  updateEnrollment(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string,
    updates: Partial<ClassEnrollmentEntity>
  ): Promise<ClassEnrollmentEntity>;
  findEnrollmentById(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string
  ): Promise<ClassEnrollmentEntity | null>;
  listEnrollments(
    tenantId: string,
    workspaceId: string,
    filters: EnrollmentListFilters,
    pagination: ListPagination
  ): Promise<{ items: ClassEnrollmentEntity[]; total: number }>;

  listAttendanceBySession(
    tenantId: string,
    workspaceId: string,
    sessionId: string
  ): Promise<ClassAttendanceEntity[]>;
  bulkUpsertAttendance(
    tenantId: string,
    workspaceId: string,
    sessionId: string,
    items: ClassAttendanceEntity[]
  ): Promise<ClassAttendanceEntity[]>;

  listBillableAttendanceForMonth(
    tenantId: string,
    workspaceId: string,
    filters: BillingPreviewFilters
  ): Promise<AttendanceBillingRow[]>;
  listBillableScheduledForMonth(
    tenantId: string,
    workspaceId: string,
    filters: BillingPreviewFilters
  ): Promise<AttendanceBillingRow[]>;

  findBillingRunByMonth(
    tenantId: string,
    workspaceId: string,
    month: string
  ): Promise<ClassMonthlyBillingRunEntity | null>;
  listBillingRunsByMonths(
    tenantId: string,
    workspaceId: string,
    months: string[]
  ): Promise<ClassMonthlyBillingRunEntity[]>;
  findBillingRunById(
    tenantId: string,
    workspaceId: string,
    billingRunId: string
  ): Promise<ClassMonthlyBillingRunEntity | null>;
  createBillingRun(run: ClassMonthlyBillingRunEntity): Promise<ClassMonthlyBillingRunEntity>;
  updateBillingRun(
    tenantId: string,
    workspaceId: string,
    billingRunId: string,
    updates: Partial<ClassMonthlyBillingRunEntity>
  ): Promise<ClassMonthlyBillingRunEntity>;
  listBillingInvoiceLinks(
    tenantId: string,
    workspaceId: string,
    billingRunId: string
  ): Promise<ClassBillingInvoiceLinkEntity[]>;
  findBillingInvoiceLinkByIdempotency(
    tenantId: string,
    workspaceId: string,
    idempotencyKey: string
  ): Promise<ClassBillingInvoiceLinkEntity | null>;
  createBillingInvoiceLink(
    link: ClassBillingInvoiceLinkEntity
  ): Promise<ClassBillingInvoiceLinkEntity>;
  deleteBillingInvoiceLinks(
    tenantId: string,
    workspaceId: string,
    billingRunId: string
  ): Promise<void>;
  isMonthLocked(tenantId: string, workspaceId: string, month: string): Promise<boolean>;
}

export const CLASSES_REPOSITORY_PORT = "classes/classes-repository";
