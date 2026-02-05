import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  ClassAttendanceEntity,
  ClassBillingInvoiceLinkEntity,
  ClassEnrollmentEntity,
  ClassGroupEntity,
  ClassMonthlyBillingRunEntity,
  ClassSessionEntity,
} from "../../domain/entities/classes.entities";
import type {
  BillingPreviewFilters,
  ClassGroupListFilters,
  ClassesRepositoryPort,
  EnrollmentListFilters,
  ListPagination,
  SessionListFilters,
} from "../../application/ports/classes-repository.port";
import type { AttendanceBillingRow } from "../../domain/rules/billing.rules";
import {
  createClassGroup,
  findClassGroupById,
  listClassGroups,
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
  findBillingInvoiceLinkByIdempotency,
  findBillingRunById,
  findBillingRunByMonth,
  isMonthLocked,
  listBillingInvoiceLinks,
  listBillableAttendanceForMonth,
  updateBillingRun,
} from "./classes.repository.billing";

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
    clientId: string,
    data: ClassEnrollmentEntity
  ): Promise<ClassEnrollmentEntity> {
    return upsertEnrollment(this.prisma, tenantId, workspaceId, classGroupId, clientId, data);
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

  async listBillableAttendanceForMonth(
    tenantId: string,
    workspaceId: string,
    filters: BillingPreviewFilters
  ): Promise<AttendanceBillingRow[]> {
    return listBillableAttendanceForMonth(this.prisma, tenantId, workspaceId, filters);
  }

  async findBillingRunByMonth(
    tenantId: string,
    workspaceId: string,
    month: string
  ): Promise<ClassMonthlyBillingRunEntity | null> {
    return findBillingRunByMonth(this.prisma, tenantId, workspaceId, month);
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

  async isMonthLocked(tenantId: string, workspaceId: string, month: string): Promise<boolean> {
    return isMonthLocked(this.prisma, tenantId, workspaceId, month);
  }
}
