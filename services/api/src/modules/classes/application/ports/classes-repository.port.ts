import type {
  ClassAttendanceEntity,
  ClassBillingInvoiceLinkEntity,
  ClassEnrollmentBillingPlanEntity,
  ClassEnrollmentEntity,
  ClassGroupEntity,
  ClassGroupInstructorEntity,
  ClassMilestoneCompletionEntity,
  ClassMilestoneEntity,
  ClassMonthlyBillingRunEntity,
  ClassProgramEntity,
  ClassProgramMilestoneTemplateEntity,
  ClassProgramSessionTemplateEntity,
  ClassGroupResourceEntity,
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
  kind?: ClassGroupEntity["kind"];
  lifecycle?: ClassGroupEntity["lifecycle"];
  startAtFrom?: Date;
  startAtTo?: Date;
  sort?: string | string[];
  filters?: unknown;
};

export type SessionListFilters = {
  q?: string;
  classGroupId?: string;
  status?: ClassSessionEntity["status"];
  type?: ClassSessionEntity["type"];
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
  payerPartyId?: string;
  status?: ClassEnrollmentEntity["status"];
  seatType?: ClassEnrollmentEntity["seatType"];
  isActive?: boolean;
  sort?: string | string[];
  filters?: unknown;
};

export type ProgramListFilters = {
  q?: string;
  levelTag?: string;
  sort?: string | string[];
};

export type BillingPreviewFilters = {
  monthStart: Date;
  monthEnd: Date;
  classGroupId?: string;
  payerClientId?: string;
};

export type BillingInvoiceSendProgress = {
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
};

export type InvoiceRecipientEmailLookup = {
  invoiceId: string;
  email: string | null;
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

  listClassGroupInstructors(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassGroupInstructorEntity[]>;
  replaceClassGroupInstructors(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    members: ClassGroupInstructorEntity[]
  ): Promise<ClassGroupInstructorEntity[]>;

  createProgram(program: ClassProgramEntity): Promise<ClassProgramEntity>;
  updateProgram(
    tenantId: string,
    workspaceId: string,
    programId: string,
    updates: Partial<ClassProgramEntity>
  ): Promise<ClassProgramEntity>;
  findProgramById(
    tenantId: string,
    workspaceId: string,
    programId: string
  ): Promise<ClassProgramEntity | null>;
  listPrograms(
    tenantId: string,
    workspaceId: string,
    filters: ProgramListFilters,
    pagination: ListPagination
  ): Promise<{ items: ClassProgramEntity[]; total: number }>;
  replaceProgramSessionTemplates(
    tenantId: string,
    workspaceId: string,
    programId: string,
    items: ClassProgramSessionTemplateEntity[]
  ): Promise<ClassProgramSessionTemplateEntity[]>;
  replaceProgramMilestoneTemplates(
    tenantId: string,
    workspaceId: string,
    programId: string,
    items: ClassProgramMilestoneTemplateEntity[]
  ): Promise<ClassProgramMilestoneTemplateEntity[]>;
  listProgramSessionTemplates(
    tenantId: string,
    workspaceId: string,
    programId: string
  ): Promise<ClassProgramSessionTemplateEntity[]>;
  listProgramMilestoneTemplates(
    tenantId: string,
    workspaceId: string,
    programId: string
  ): Promise<ClassProgramMilestoneTemplateEntity[]>;

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

  findEnrollmentBillingPlan(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string
  ): Promise<ClassEnrollmentBillingPlanEntity | null>;
  upsertEnrollmentBillingPlan(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string,
    data: ClassEnrollmentBillingPlanEntity
  ): Promise<ClassEnrollmentBillingPlanEntity>;

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

  listMilestonesByClassGroup(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassMilestoneEntity[]>;
  createMilestone(milestone: ClassMilestoneEntity): Promise<ClassMilestoneEntity>;
  updateMilestone(
    tenantId: string,
    workspaceId: string,
    milestoneId: string,
    updates: Partial<ClassMilestoneEntity>
  ): Promise<ClassMilestoneEntity>;
  deleteMilestone(tenantId: string, workspaceId: string, milestoneId: string): Promise<void>;
  findMilestoneById(
    tenantId: string,
    workspaceId: string,
    milestoneId: string
  ): Promise<ClassMilestoneEntity | null>;

  upsertMilestoneCompletion(
    tenantId: string,
    workspaceId: string,
    milestoneId: string,
    enrollmentId: string,
    data: ClassMilestoneCompletionEntity
  ): Promise<ClassMilestoneCompletionEntity>;
  listMilestoneCompletionsByClassGroup(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassMilestoneCompletionEntity[]>;

  listResourcesByClassGroup(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassGroupResourceEntity[]>;
  createResource(resource: ClassGroupResourceEntity): Promise<ClassGroupResourceEntity>;
  updateResource(
    tenantId: string,
    workspaceId: string,
    resourceId: string,
    updates: Partial<ClassGroupResourceEntity>
  ): Promise<ClassGroupResourceEntity>;
  deleteResource(tenantId: string, workspaceId: string, resourceId: string): Promise<void>;
  reorderResources(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    orderedIds: string[]
  ): Promise<void>;
  findResourceById(
    tenantId: string,
    workspaceId: string,
    resourceId: string
  ): Promise<ClassGroupResourceEntity | null>;

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
  listBillingInvoiceLinksByEnrollment(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string
  ): Promise<ClassBillingInvoiceLinkEntity[]>;
  getInvoiceStatusesByIds?(
    workspaceId: string,
    invoiceIds: string[]
  ): Promise<Record<string, "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED">>;
  getBillingInvoiceSendProgress?(
    workspaceId: string,
    invoiceIds: string[],
    sentAfter: Date,
    expectedInvoiceCount: number
  ): Promise<BillingInvoiceSendProgress>;
  getInvoiceRecipientEmailsByIds?(
    tenantId: string,
    workspaceId: string,
    invoiceIds: string[]
  ): Promise<InvoiceRecipientEmailLookup[]>;
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
