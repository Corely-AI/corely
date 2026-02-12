import {
  ClassesBulkUpsertAttendanceToolInputSchema,
  ClassesGetClassRosterToolInputSchema,
  ClassesGetSessionDetailToolInputSchema,
  ClassesListClassGroupsToolInputSchema,
  ClassesListNeedsAttentionSessionsToolInputSchema,
  ClassesListSessionsToolInputSchema,
  ClassesMarkSessionDoneToolInputSchema,
  TeacherDashboardSummaryQuerySchema,
  TeacherDashboardUnpaidInvoicesQuerySchema,
} from "@corely/contracts/classes";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type GetClassGroupUseCase } from "../../application/use-cases/get-class-group.usecase";
import { type GetSessionAttendanceUseCase } from "../../application/use-cases/get-session-attendance.usecase";
import { type GetSessionUseCase } from "../../application/use-cases/get-session.usecase";
import { type ListClassGroupsUseCase } from "../../application/use-cases/list-class-groups.usecase";
import { type ListEnrollmentsUseCase } from "../../application/use-cases/list-enrollments.usecase";
import { type ListSessionsUseCase } from "../../application/use-cases/list-sessions.usecase";
import { type BulkUpsertAttendanceUseCase } from "../../application/use-cases/bulk-upsert-attendance.usecase";
import { type GetTeacherDashboardSummaryUseCase } from "../../application/use-cases/get-teacher-dashboard-summary.use-case";
import { type GetTeacherDashboardUnpaidInvoicesUseCase } from "../../application/use-cases/get-teacher-dashboard-unpaid-invoices.use-case";
import { type UpdateSessionUseCase } from "../../application/use-cases/update-session.usecase";

const defaultDateRange = () => {
  const now = new Date();
  return {
    dateFrom: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
    ).toISOString(),
    dateTo: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    ).toISOString(),
  };
};

export const buildClassesTools = (deps: {
  getSummary: GetTeacherDashboardSummaryUseCase;
  getUnpaidInvoices: GetTeacherDashboardUnpaidInvoicesUseCase;
  listClassGroups: ListClassGroupsUseCase;
  listSessions: ListSessionsUseCase;
  getSession: GetSessionUseCase;
  getSessionAttendance: GetSessionAttendanceUseCase;
  listEnrollments: ListEnrollmentsUseCase;
  getClassGroup: GetClassGroupUseCase;
  updateSession: UpdateSessionUseCase;
  bulkUpsertAttendance: BulkUpsertAttendanceUseCase;
}): DomainToolPort[] => [
  {
    name: "classes_listClassGroups",
    description:
      "List class groups for the current workspace with optional active/search filters (READ).",
    kind: "server",
    inputSchema: ClassesListClassGroupsToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = ClassesListClassGroupsToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      return deps.listClassGroups.execute(
        {
          q: parsed.data.q,
          page: parsed.data.page ?? 1,
          pageSize: parsed.data.pageSize ?? 50,
          sort: parsed.data.sort,
          filters: parsed.data.filters,
          subject: parsed.data.subject,
          level: parsed.data.level,
          status: parsed.data.activeOnly ? "ACTIVE" : parsed.data.status,
        },
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
    },
  },
  {
    name: "classes_listSessions",
    description:
      "List class sessions in a date range with optional class group and status filters (READ).",
    kind: "server",
    inputSchema: ClassesListSessionsToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = ClassesListSessionsToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      return deps.listSessions.execute(
        {
          q: parsed.data.q,
          page: parsed.data.page ?? 1,
          pageSize: parsed.data.pageSize ?? 50,
          sort: parsed.data.sort,
          filters: parsed.data.filters,
          dateFrom: parsed.data.dateFrom,
          dateTo: parsed.data.dateTo,
          classGroupId: parsed.data.classGroupId,
          status: parsed.data.status,
        },
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
    },
  },
  {
    name: "classes_getSessionDetail",
    description: "Get one session detail and attendance health indicators (READ).",
    kind: "server",
    inputSchema: ClassesGetSessionDetailToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = ClassesGetSessionDetailToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const ctx = buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId });
      const session = await deps.getSession.execute({ sessionId: parsed.data.sessionId }, ctx);
      const attendance = await deps.getSessionAttendance.execute(
        { sessionId: parsed.data.sessionId },
        ctx
      );
      const enrollments = await deps.listEnrollments.execute(
        {
          classGroupId: session.classGroupId,
          isActive: true,
          page: 1,
          pageSize: 1000,
        },
        ctx
      );

      const attendanceByEnrollment = new Set(attendance.items.map((item) => item.enrollmentId));
      const expectedEnrollments = enrollments.items.filter((item) => {
        if (item.startDate && item.startDate > session.startsAt) {
          return false;
        }
        if (item.endDate && item.endDate < session.startsAt) {
          return false;
        }
        return true;
      });

      const missingAttendance = expectedEnrollments.filter(
        (item) => !attendanceByEnrollment.has(item.id)
      ).length;

      return {
        session,
        attendance: {
          locked: attendance.locked,
          totalRecords: attendance.items.length,
          expectedEnrollments: expectedEnrollments.length,
          missingAttendance,
          byStatus: {
            present: attendance.items.filter((item) => item.status === "PRESENT").length,
            absent: attendance.items.filter((item) => item.status === "ABSENT").length,
            makeup: attendance.items.filter((item) => item.status === "MAKEUP").length,
            excused: attendance.items.filter((item) => item.status === "EXCUSED").length,
          },
        },
      };
    },
  },
  {
    name: "classes_listNeedsAttentionSessions",
    description:
      "List sessions that need attention (missing attendance and unfinished past sessions) in an optional range (READ).",
    kind: "server",
    inputSchema: ClassesListNeedsAttentionSessionsToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = ClassesListNeedsAttentionSessionsToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const range = {
        ...defaultDateRange(),
        ...parsed.data,
      };
      const summary = await deps.getSummary.execute(
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId }),
        {
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          classGroupId: parsed.data.classGroupId,
        }
      );

      return {
        range: summary.range,
        counts: {
          missingAttendance: summary.counts.missingAttendance,
          unfinishedPastSessions: summary.counts.unfinishedPastSessions,
        },
        missingAttendanceSessions: summary.needsAttention.missingAttendanceSessions,
        unfinishedPastSessions: summary.needsAttention.unfinishedPastSessions,
        items: [
          ...summary.needsAttention.missingAttendanceSessions.map((item) => ({
            reason: "MISSING_ATTENDANCE" as const,
            session: item,
          })),
          ...summary.needsAttention.unfinishedPastSessions.map((item) => ({
            reason: "UNFINISHED_PAST_SESSION" as const,
            session: item,
          })),
        ],
      };
    },
  },
  {
    name: "classes_getClassRoster",
    description:
      "Get roster for one class group with student/payer identifiers and payer health flags (READ).",
    kind: "server",
    inputSchema: ClassesGetClassRosterToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = ClassesGetClassRosterToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const ctx = buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId });
      const classGroup = await deps.getClassGroup.execute(
        { classGroupId: parsed.data.classGroupId },
        ctx
      );
      const enrollments = await deps.listEnrollments.execute(
        {
          classGroupId: parsed.data.classGroupId,
          isActive: parsed.data.includeInactive ? undefined : true,
          page: 1,
          pageSize: 1000,
        },
        ctx
      );

      const items = enrollments.items.map((item) => {
        const payerClientId = item.payerClientId;
        const isMissingPayer = !payerClientId || payerClientId.trim().length === 0;
        const isSelfPayer = !isMissingPayer && payerClientId === item.studentClientId;

        return {
          enrollmentId: item.id,
          classGroupId: item.classGroupId,
          student: {
            clientId: item.studentClientId,
          },
          guardiansSummary: {
            primaryPayerClientId: isMissingPayer ? null : payerClientId,
            totalGuardians: 0,
          },
          payerStatus: {
            missingPayer: isMissingPayer,
            selfPayer: isSelfPayer,
          },
          isActive: item.isActive,
        };
      });

      return {
        classGroup: {
          id: classGroup.id,
          name: classGroup.name,
          subject: classGroup.subject,
          level: classGroup.level,
          status: classGroup.status,
        },
        counts: {
          total: items.length,
          missingPayer: items.filter((item) => item.payerStatus.missingPayer).length,
          selfPayer: items.filter((item) => item.payerStatus.selfPayer).length,
        },
        items,
      };
    },
  },
  {
    name: "classes_getTeacherDashboardSummary",
    description:
      "Get teacher dashboard summary metrics for classes in a date range (sessions and attendance health, READ).",
    kind: "server",
    inputSchema: TeacherDashboardSummaryQuerySchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TeacherDashboardSummaryQuerySchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      return deps.getSummary.execute(
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId }),
        parsed.data
      );
    },
  },
  {
    name: "classes_getTeacherDashboardUnpaidInvoices",
    description:
      "Get count of unpaid class-related invoices (optionally filtered by class group, READ).",
    kind: "server",
    inputSchema: TeacherDashboardUnpaidInvoicesQuerySchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TeacherDashboardUnpaidInvoicesQuerySchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      return deps.getUnpaidInvoices.execute(
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId }),
        parsed.data
      );
    },
  },
  {
    name: "classes_markSessionDone",
    description: "Mark one session as DONE (WRITE, requires explicit user confirmation).",
    kind: "server",
    needsApproval: true,
    inputSchema: ClassesMarkSessionDoneToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = ClassesMarkSessionDoneToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const session = await deps.updateSession.execute(
        { sessionId: parsed.data.sessionId, status: "DONE" },
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );

      return {
        sessionId: session.id,
        status: session.status,
        startsAt: session.startsAt,
        classGroupId: session.classGroupId,
      };
    },
  },
  {
    name: "classes_bulkUpsertAttendance",
    description:
      "Bulk upsert attendance entries for a session (WRITE, requires explicit user confirmation).",
    kind: "server",
    needsApproval: true,
    inputSchema: ClassesBulkUpsertAttendanceToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = ClassesBulkUpsertAttendanceToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const ctx = buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId });
      const session = await deps.getSession.execute({ sessionId: parsed.data.sessionId }, ctx);

      const resolvedItems: Array<{
        enrollmentId: string;
        status: "PRESENT" | "ABSENT" | "MAKEUP" | "EXCUSED";
        billable?: boolean;
        note?: string | null;
      }> = [];

      for (const item of parsed.data.items) {
        if (item.enrollmentId) {
          resolvedItems.push({
            enrollmentId: item.enrollmentId,
            status: item.status,
            billable: item.billable,
            note: item.note,
          });
          continue;
        }

        const matches = await deps.listEnrollments.execute(
          {
            classGroupId: session.classGroupId,
            studentClientId: item.studentId,
            page: 1,
            pageSize: 5,
          },
          ctx
        );

        if (matches.items.length !== 1) {
          return validationError({
            items: [
              {
                studentId: item.studentId,
                message:
                  matches.items.length === 0
                    ? "No enrollment found for studentId in this class group"
                    : "Multiple enrollments found for studentId in this class group",
              },
            ],
          });
        }

        resolvedItems.push({
          enrollmentId: matches.items[0].id,
          status: item.status,
          billable: item.billable,
          note: item.note,
        });
      }

      const saved = await deps.bulkUpsertAttendance.execute(
        {
          sessionId: parsed.data.sessionId,
          idempotencyKey: parsed.data.idempotencyKey,
          items: resolvedItems,
        },
        ctx
      );

      return {
        sessionId: parsed.data.sessionId,
        updatedCount: saved.length,
        failedCount: 0,
        items: saved,
      };
    },
  },
];
