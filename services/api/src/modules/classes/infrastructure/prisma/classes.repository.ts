import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
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
import type {
  BillingPreviewFilters,
  ClassGroupListFilters,
  ClassesRepositoryPort,
  EnrollmentListFilters,
  ListPagination,
  ProgramListFilters,
  SessionListFilters,
} from "../../application/ports/classes-repository.port";
import type { AttendanceBillingRow } from "../../domain/rules/billing.rules";
import {
  createClassGroup,
  findClassGroupById,
  listClassGroups,
  listClassGroupsWithSchedulePattern,
  updateClassGroup,
} from "./classes.repository.class-groups";
import {
  createSession,
  findSessionById,
  listSessions,
  updateSession,
  upsertSession,
} from "./classes.repository.sessions";
import {
  findEnrollmentById,
  listEnrollments,
  updateEnrollment,
  upsertEnrollment,
} from "./classes.repository.enrollments";
import { bulkUpsertAttendance, listAttendanceBySession } from "./classes.repository.attendance";
import {
  createBillingInvoiceLink,
  createBillingRun,
  deleteBillingInvoiceLinks,
  findBillingInvoiceLinkByIdempotency,
  findBillingRunById,
  findBillingRunByMonth,
  getBillingInvoiceSendProgress,
  getInvoiceRecipientEmailsByIds,
  getInvoiceStatusesByIds,
  isMonthLocked,
  listBillingInvoiceLinks,
  listBillingInvoiceLinksByEnrollment,
  listBillingRunsByMonths,
  listBillableAttendanceForMonth,
  listBillableScheduledForMonth,
  updateBillingRun,
} from "./classes.repository.billing";
import {
  createProgram,
  findProgramById,
  listProgramMilestoneTemplates,
  listProgramSessionTemplates,
  listPrograms,
  replaceProgramMilestoneTemplates,
  replaceProgramSessionTemplates,
  updateProgram,
} from "./class-programs.repository";
import {
  listClassGroupInstructors,
  replaceClassGroupInstructors,
} from "./class-group-instructors.repository";
import {
  findEnrollmentBillingPlan,
  upsertEnrollmentBillingPlan,
} from "./class-enrollment-billing-plans.repository";
import {
  createMilestone,
  deleteMilestone,
  findMilestoneById,
  listMilestonesByClassGroup,
  updateMilestone,
} from "./class-milestones.repository";
import {
  listMilestoneCompletionsByClassGroup,
  upsertMilestoneCompletion,
} from "./class-milestone-completions.repository";
import {
  createResource,
  deleteResource,
  findResourceById,
  listResourcesByClassGroup,
  reorderResources,
  updateResource,
} from "./class-group-resources.repository";

@Injectable()
export class PrismaClassesRepository implements ClassesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createClassGroup(group: ClassGroupEntity): Promise<ClassGroupEntity> {
    return createClassGroup(this.prisma, group);
  }

  async updateClassGroup(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    updates: Partial<ClassGroupEntity>
  ): Promise<ClassGroupEntity> {
    return updateClassGroup(this.prisma, tenantId, classGroupId, updates);
  }

  async findClassGroupById(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassGroupEntity | null> {
    return findClassGroupById(this.prisma, tenantId, workspaceId, classGroupId);
  }

  async listClassGroups(
    tenantId: string,
    workspaceId: string,
    filters: ClassGroupListFilters,
    pagination: ListPagination
  ): Promise<{ items: ClassGroupEntity[]; total: number }> {
    return listClassGroups(this.prisma, tenantId, workspaceId, filters, pagination);
  }

  async listClassGroupsWithSchedulePattern(
    tenantId: string,
    workspaceId: string
  ): Promise<ClassGroupEntity[]> {
    return listClassGroupsWithSchedulePattern(this.prisma, tenantId, workspaceId);
  }

  async listClassGroupInstructors(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassGroupInstructorEntity[]> {
    return listClassGroupInstructors(this.prisma, tenantId, workspaceId, classGroupId);
  }

  async replaceClassGroupInstructors(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    members: ClassGroupInstructorEntity[]
  ): Promise<ClassGroupInstructorEntity[]> {
    return replaceClassGroupInstructors(this.prisma, tenantId, workspaceId, classGroupId, members);
  }

  async createProgram(program: ClassProgramEntity): Promise<ClassProgramEntity> {
    return createProgram(this.prisma, program);
  }

  async updateProgram(
    tenantId: string,
    workspaceId: string,
    programId: string,
    updates: Partial<ClassProgramEntity>
  ): Promise<ClassProgramEntity> {
    return updateProgram(this.prisma, tenantId, workspaceId, programId, updates);
  }

  async findProgramById(
    tenantId: string,
    workspaceId: string,
    programId: string
  ): Promise<ClassProgramEntity | null> {
    return findProgramById(this.prisma, tenantId, workspaceId, programId);
  }

  async listPrograms(
    tenantId: string,
    workspaceId: string,
    filters: ProgramListFilters,
    pagination: ListPagination
  ): Promise<{ items: ClassProgramEntity[]; total: number }> {
    return listPrograms(this.prisma, tenantId, workspaceId, filters, pagination);
  }

  async replaceProgramSessionTemplates(
    tenantId: string,
    workspaceId: string,
    programId: string,
    items: ClassProgramSessionTemplateEntity[]
  ): Promise<ClassProgramSessionTemplateEntity[]> {
    return replaceProgramSessionTemplates(this.prisma, tenantId, workspaceId, programId, items);
  }

  async replaceProgramMilestoneTemplates(
    tenantId: string,
    workspaceId: string,
    programId: string,
    items: ClassProgramMilestoneTemplateEntity[]
  ): Promise<ClassProgramMilestoneTemplateEntity[]> {
    return replaceProgramMilestoneTemplates(this.prisma, tenantId, workspaceId, programId, items);
  }

  async listProgramSessionTemplates(
    tenantId: string,
    workspaceId: string,
    programId: string
  ): Promise<ClassProgramSessionTemplateEntity[]> {
    return listProgramSessionTemplates(this.prisma, tenantId, workspaceId, programId);
  }

  async listProgramMilestoneTemplates(
    tenantId: string,
    workspaceId: string,
    programId: string
  ): Promise<ClassProgramMilestoneTemplateEntity[]> {
    return listProgramMilestoneTemplates(this.prisma, tenantId, workspaceId, programId);
  }

  async createSession(session: ClassSessionEntity): Promise<ClassSessionEntity> {
    return createSession(this.prisma, session);
  }

  async upsertSession(session: ClassSessionEntity): Promise<ClassSessionEntity> {
    return upsertSession(this.prisma, session);
  }

  async updateSession(
    tenantId: string,
    workspaceId: string,
    sessionId: string,
    updates: Partial<ClassSessionEntity>
  ): Promise<ClassSessionEntity> {
    return updateSession(this.prisma, tenantId, sessionId, updates);
  }

  async findSessionById(
    tenantId: string,
    workspaceId: string,
    sessionId: string
  ): Promise<ClassSessionEntity | null> {
    return findSessionById(this.prisma, tenantId, workspaceId, sessionId);
  }

  async listSessions(
    tenantId: string,
    workspaceId: string,
    filters: SessionListFilters,
    pagination: ListPagination
  ): Promise<{ items: ClassSessionEntity[]; total: number }> {
    return listSessions(this.prisma, tenantId, workspaceId, filters, pagination);
  }

  async upsertEnrollment(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    studentClientId: string,
    data: ClassEnrollmentEntity
  ): Promise<ClassEnrollmentEntity> {
    return upsertEnrollment(
      this.prisma,
      tenantId,
      workspaceId,
      classGroupId,
      studentClientId,
      data
    );
  }

  async updateEnrollment(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string,
    updates: Partial<ClassEnrollmentEntity>
  ): Promise<ClassEnrollmentEntity> {
    return updateEnrollment(this.prisma, tenantId, enrollmentId, updates);
  }

  async findEnrollmentById(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string
  ): Promise<ClassEnrollmentEntity | null> {
    return findEnrollmentById(this.prisma, tenantId, workspaceId, enrollmentId);
  }

  async listEnrollments(
    tenantId: string,
    workspaceId: string,
    filters: EnrollmentListFilters,
    pagination: ListPagination
  ): Promise<{ items: ClassEnrollmentEntity[]; total: number }> {
    return listEnrollments(this.prisma, tenantId, workspaceId, filters, pagination);
  }

  async findEnrollmentBillingPlan(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string
  ): Promise<ClassEnrollmentBillingPlanEntity | null> {
    return findEnrollmentBillingPlan(this.prisma, tenantId, workspaceId, enrollmentId);
  }

  async upsertEnrollmentBillingPlan(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string,
    data: ClassEnrollmentBillingPlanEntity
  ): Promise<ClassEnrollmentBillingPlanEntity> {
    return upsertEnrollmentBillingPlan(this.prisma, tenantId, workspaceId, enrollmentId, data);
  }

  async listAttendanceBySession(
    tenantId: string,
    workspaceId: string,
    sessionId: string
  ): Promise<ClassAttendanceEntity[]> {
    return listAttendanceBySession(this.prisma, tenantId, workspaceId, sessionId);
  }

  async bulkUpsertAttendance(
    tenantId: string,
    workspaceId: string,
    sessionId: string,
    items: ClassAttendanceEntity[]
  ): Promise<ClassAttendanceEntity[]> {
    return bulkUpsertAttendance(this.prisma, tenantId, workspaceId, sessionId, items);
  }

  async listMilestonesByClassGroup(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassMilestoneEntity[]> {
    return listMilestonesByClassGroup(this.prisma, tenantId, workspaceId, classGroupId);
  }

  async createMilestone(milestone: ClassMilestoneEntity): Promise<ClassMilestoneEntity> {
    return createMilestone(this.prisma, milestone);
  }

  async updateMilestone(
    tenantId: string,
    workspaceId: string,
    milestoneId: string,
    updates: Partial<ClassMilestoneEntity>
  ): Promise<ClassMilestoneEntity> {
    return updateMilestone(this.prisma, tenantId, workspaceId, milestoneId, updates);
  }

  async deleteMilestone(tenantId: string, workspaceId: string, milestoneId: string): Promise<void> {
    return deleteMilestone(this.prisma, tenantId, workspaceId, milestoneId);
  }

  async findMilestoneById(
    tenantId: string,
    workspaceId: string,
    milestoneId: string
  ): Promise<ClassMilestoneEntity | null> {
    return findMilestoneById(this.prisma, tenantId, workspaceId, milestoneId);
  }

  async upsertMilestoneCompletion(
    tenantId: string,
    workspaceId: string,
    milestoneId: string,
    enrollmentId: string,
    data: ClassMilestoneCompletionEntity
  ): Promise<ClassMilestoneCompletionEntity> {
    return upsertMilestoneCompletion(
      this.prisma,
      tenantId,
      workspaceId,
      milestoneId,
      enrollmentId,
      data
    );
  }

  async listMilestoneCompletionsByClassGroup(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassMilestoneCompletionEntity[]> {
    return listMilestoneCompletionsByClassGroup(this.prisma, tenantId, workspaceId, classGroupId);
  }

  async listResourcesByClassGroup(
    tenantId: string,
    workspaceId: string,
    classGroupId: string
  ): Promise<ClassGroupResourceEntity[]> {
    return listResourcesByClassGroup(this.prisma, tenantId, workspaceId, classGroupId);
  }

  async createResource(resource: ClassGroupResourceEntity): Promise<ClassGroupResourceEntity> {
    return createResource(this.prisma, resource);
  }

  async updateResource(
    tenantId: string,
    workspaceId: string,
    resourceId: string,
    updates: Partial<ClassGroupResourceEntity>
  ): Promise<ClassGroupResourceEntity> {
    return updateResource(this.prisma, tenantId, workspaceId, resourceId, updates);
  }

  async deleteResource(tenantId: string, workspaceId: string, resourceId: string): Promise<void> {
    return deleteResource(this.prisma, tenantId, workspaceId, resourceId);
  }

  async reorderResources(
    tenantId: string,
    workspaceId: string,
    classGroupId: string,
    orderedIds: string[]
  ): Promise<void> {
    return reorderResources(this.prisma, tenantId, workspaceId, classGroupId, orderedIds);
  }

  async findResourceById(
    tenantId: string,
    workspaceId: string,
    resourceId: string
  ): Promise<ClassGroupResourceEntity | null> {
    return findResourceById(this.prisma, tenantId, workspaceId, resourceId);
  }

  async listBillableAttendanceForMonth(
    tenantId: string,
    workspaceId: string,
    filters: BillingPreviewFilters
  ): Promise<AttendanceBillingRow[]> {
    return listBillableAttendanceForMonth(this.prisma, tenantId, workspaceId, filters);
  }

  async listBillableScheduledForMonth(
    tenantId: string,
    workspaceId: string,
    filters: BillingPreviewFilters
  ): Promise<AttendanceBillingRow[]> {
    return listBillableScheduledForMonth(this.prisma, tenantId, workspaceId, filters);
  }

  async findBillingRunByMonth(
    tenantId: string,
    workspaceId: string,
    month: string
  ): Promise<ClassMonthlyBillingRunEntity | null> {
    return findBillingRunByMonth(this.prisma, tenantId, workspaceId, month);
  }

  async listBillingRunsByMonths(
    tenantId: string,
    workspaceId: string,
    months: string[]
  ): Promise<ClassMonthlyBillingRunEntity[]> {
    return listBillingRunsByMonths(this.prisma, tenantId, workspaceId, months);
  }

  async findBillingRunById(
    tenantId: string,
    workspaceId: string,
    billingRunId: string
  ): Promise<ClassMonthlyBillingRunEntity | null> {
    return findBillingRunById(this.prisma, tenantId, workspaceId, billingRunId);
  }

  async createBillingRun(run: ClassMonthlyBillingRunEntity): Promise<ClassMonthlyBillingRunEntity> {
    return createBillingRun(this.prisma, run);
  }

  async updateBillingRun(
    tenantId: string,
    workspaceId: string,
    billingRunId: string,
    updates: Partial<ClassMonthlyBillingRunEntity>
  ): Promise<ClassMonthlyBillingRunEntity> {
    return updateBillingRun(this.prisma, tenantId, billingRunId, updates);
  }

  async listBillingInvoiceLinks(
    tenantId: string,
    workspaceId: string,
    billingRunId: string
  ): Promise<ClassBillingInvoiceLinkEntity[]> {
    return listBillingInvoiceLinks(this.prisma, tenantId, workspaceId, billingRunId);
  }

  async listBillingInvoiceLinksByEnrollment(
    tenantId: string,
    workspaceId: string,
    enrollmentId: string
  ): Promise<ClassBillingInvoiceLinkEntity[]> {
    return listBillingInvoiceLinksByEnrollment(this.prisma, tenantId, workspaceId, enrollmentId);
  }

  async getInvoiceStatusesByIds(workspaceId: string, invoiceIds: string[]) {
    return getInvoiceStatusesByIds(this.prisma, workspaceId, invoiceIds);
  }

  async getInvoiceRecipientEmailsByIds(
    tenantId: string,
    workspaceId: string,
    invoiceIds: string[]
  ) {
    return getInvoiceRecipientEmailsByIds(this.prisma, tenantId, workspaceId, invoiceIds);
  }

  async getBillingInvoiceSendProgress(
    workspaceId: string,
    invoiceIds: string[],
    sentAfter: Date,
    expectedInvoiceCount: number
  ) {
    return getBillingInvoiceSendProgress(
      this.prisma,
      workspaceId,
      invoiceIds,
      sentAfter,
      expectedInvoiceCount
    );
  }

  async findBillingInvoiceLinkByIdempotency(
    tenantId: string,
    workspaceId: string,
    idempotencyKey: string
  ): Promise<ClassBillingInvoiceLinkEntity | null> {
    return findBillingInvoiceLinkByIdempotency(this.prisma, tenantId, workspaceId, idempotencyKey);
  }

  async createBillingInvoiceLink(
    link: ClassBillingInvoiceLinkEntity
  ): Promise<ClassBillingInvoiceLinkEntity> {
    return createBillingInvoiceLink(this.prisma, link);
  }

  async deleteBillingInvoiceLinks(
    tenantId: string,
    workspaceId: string,
    billingRunId: string
  ): Promise<void> {
    return deleteBillingInvoiceLinks(this.prisma, tenantId, workspaceId, billingRunId);
  }

  async isMonthLocked(tenantId: string, workspaceId: string, month: string): Promise<boolean> {
    return isMonthLocked(this.prisma, tenantId, workspaceId, month);
  }
}
