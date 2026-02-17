import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@corely/data";
import { TeacherDashboardQueryPort } from "../../application/ports/teacher-dashboard-query.port";
import {
  TeacherDashboardSummaryQuery,
  TeacherDashboardSummaryResponse,
  TeacherDashboardUnpaidInvoicesResponse,
  TeacherDashboardUnpaidInvoicesQuery,
  ClassSessionStatus,
} from "@corely/contracts/classes";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import console from "console";

@Injectable()
export class PrismaTeacherDashboardQuery implements TeacherDashboardQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    tenantId: string,
    workspaceId: string,
    query: TeacherDashboardSummaryQuery
  ): Promise<TeacherDashboardSummaryResponse> {
    const { dateFrom, dateTo, classGroupId } = query;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Parse once
    const rangeFrom = new Date(dateFrom);
    const rangeTo = new Date(dateTo);
    const upcomingFrom = rangeFrom < now ? now : rangeFrom;

    // IMPORTANT: Keep workspace filtering consistent across ALL queries
    const whereBase = {
      tenantId,
      workspaceId,
      ...(classGroupId ? { classGroupId } : {}),
    };

    /**
     * OPTIMIZATION SUMMARY
     * - Use $transaction to execute independent queries in parallel.
     * - Replace several .count() calls with one SQL that computes all session counts.
     * - Fix "studentsMissingPayerCount" bug (it was LIMIT 10 length).
     * - Compute unpaid invoices in SQL (no in-memory reduce/filter over lines/payments).
     *
     * NOTE: Table/schema names in $queryRaw must match your Prisma mappings.
     * - Enrollment table in your repo is crm."ClassEnrollment" (already used in your code)
     * - Adjust invoice schema/table names below if yours differs.
     */

    const [
      sessionCountsRows,
      upcomingSessions,
      missingAttendanceSessions,
      unfinishedPastSessions,
      studentsMissingPayerRows,
      // unpaidInvoicesRows, // Removed from transaction
    ] = await this.prisma.$transaction([
      // 1) Session counts in ONE query
      this.prisma.$queryRaw<
        Array<{
          today_sessions: number;
          week_sessions: number;
          missing_attendance: number;
          unfinished_past_sessions: number;
        }>
      >(
        Prisma.sql`
          SELECT
            COUNT(*) FILTER (
              WHERE s."startsAt" >= ${todayStart} AND s."startsAt" <= ${todayEnd}
                AND s."status" <> 'CANCELLED'
            )::int AS today_sessions,

            COUNT(*) FILTER (
              WHERE s."startsAt" >= ${weekStart} AND s."startsAt" <= ${weekEnd}
                AND s."status" <> 'CANCELLED'
            )::int AS week_sessions,

            COUNT(*) FILTER (
              WHERE s."startsAt" < ${now}
                AND s."status" <> 'CANCELLED'
                AND NOT EXISTS (
                  SELECT 1
                  FROM crm."ClassAttendance" a
                  WHERE a."tenantId" = s."tenantId"
                    AND a."workspaceId" = s."workspaceId"
                    AND a."sessionId" = s."id"
                )
            )::int AS missing_attendance,

            COUNT(*) FILTER (
              WHERE s."startsAt" < ${now}
                AND s."status" = 'PLANNED'
            )::int AS unfinished_past_sessions
          FROM crm."ClassSession" s
          WHERE s."tenantId" = ${tenantId}
            AND s."workspaceId" = ${workspaceId}
            ${classGroupId ? Prisma.sql`AND s."classGroupId" = ${classGroupId}` : Prisma.empty}
        `
      ),

      // 2) Upcoming sessions list (keep Prisma, select only required fields)
      this.prisma.classSession.findMany({
        where: {
          ...whereBase,
          startsAt: { gte: upcomingFrom, lte: rangeTo },
          status: { not: "CANCELLED" },
        },
        orderBy: { startsAt: "asc" },
        take: 50,
        select: {
          id: true,
          classGroupId: true,
          startsAt: true,
          endsAt: true,
          status: true,
          topic: true,
          classGroup: { select: { name: true } },
        },
      }),

      // 3) Needs attention: Missing attendance (top 10)
      this.prisma.classSession.findMany({
        where: {
          ...whereBase,
          status: { not: "CANCELLED" },
          startsAt: { lt: now },
          attendance: { none: {} },
        },
        orderBy: { startsAt: "desc" },
        take: 10,
        select: {
          id: true,
          classGroupId: true,
          startsAt: true,
          endsAt: true,
          status: true,
          topic: true,
          classGroup: { select: { name: true } },
        },
      }),

      // 4) Needs attention: Unfinished past sessions (top 10)
      this.prisma.classSession.findMany({
        where: {
          ...whereBase,
          status: "PLANNED",
          startsAt: { lt: now },
        },
        orderBy: { startsAt: "asc" }, // oldest first
        take: 10,
        select: {
          id: true,
          classGroupId: true,
          startsAt: true,
          endsAt: true,
          status: true,
          topic: true,
          classGroup: { select: { name: true } },
        },
      }),

      // 5) Students missing payer: list + correct total_count via window function
      // Definition: payerClientId IS NULL OR payerClientId == studentClientId (self-payer)
      this.prisma.$queryRaw<
        Array<{
          id: string;
          clientId: string;
          classGroupId: string;
          classGroupName: string;
          total_count: number;
        }>
      >(
        Prisma.sql`
          SELECT
            e.id,
            e."studentClientId" AS "clientId",
            e."classGroupId",
            cg.name AS "classGroupName",
            COUNT(*) OVER()::int AS total_count
          FROM crm."ClassEnrollment" e
          JOIN crm."ClassGroup" cg
            ON cg.id = e."classGroupId"
           AND cg."tenantId" = e."tenantId"
           AND cg."workspaceId" = e."workspaceId"
          WHERE e."tenantId" = ${tenantId}
            AND e."workspaceId" = ${workspaceId}
            AND e."isActive" = true
            AND (e."payerClientId" IS NULL OR e."payerClientId" = e."studentClientId")
            ${classGroupId ? Prisma.sql`AND e."classGroupId" = ${classGroupId}` : Prisma.empty}
          ORDER BY cg.name ASC, e.id ASC
          LIMIT 10
        `
      ),
    ]);

    const sessionCounts = sessionCountsRows[0] ?? {
      today_sessions: 0,
      week_sessions: 0,
      missing_attendance: 0,
      unfinished_past_sessions: 0,
    };

    const studentsMissingPayerCount =
      studentsMissingPayerRows.length > 0 ? studentsMissingPayerRows[0].total_count : 0;

    // const unpaidInvoicesCount =
    //   unpaidInvoicesRows.length > 0 ? unpaidInvoicesRows[0].total_count : 0;

    return {
      range: {
        dateFrom: rangeFrom.toISOString(),
        dateTo: rangeTo.toISOString(),
      },
      counts: {
        todaySessions: sessionCounts.today_sessions,
        weekSessions: sessionCounts.week_sessions,
        missingAttendance: sessionCounts.missing_attendance,
        unfinishedPastSessions: sessionCounts.unfinished_past_sessions,
        studentsMissingPayer: studentsMissingPayerCount,
      },
      upcomingSessions: upcomingSessions.map((s) => ({
        id: s.id,
        classGroupId: s.classGroupId,
        classGroupName: s.classGroup.name,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt?.toISOString(),
        status: s.status as ClassSessionStatus,
        topic: s.topic,
      })),
      needsAttention: {
        missingAttendanceSessions: missingAttendanceSessions.map((s) => ({
          id: s.id,
          classGroupId: s.classGroupId,
          classGroupName: s.classGroup.name,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt?.toISOString(),
          status: s.status as ClassSessionStatus,
          topic: s.topic,
        })),
        unfinishedPastSessions: unfinishedPastSessions.map((s) => ({
          id: s.id,
          classGroupId: s.classGroupId,
          classGroupName: s.classGroup.name,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt?.toISOString(),
          status: s.status as ClassSessionStatus,
          topic: s.topic,
        })),
        studentsMissingPayer: studentsMissingPayerRows.map((e) => ({
          id: e.id,
          clientId: e.clientId,
          classGroupId: e.classGroupId,
          classGroupName: e.classGroupName,
          studentName: e.clientId, // TODO: join Party/Client for display name if needed
        })),
      },
    };
  }

  async getUnpaidInvoices(
    tenantId: string,
    workspaceId: string,
    query: TeacherDashboardUnpaidInvoicesQuery
  ): Promise<TeacherDashboardUnpaidInvoicesResponse> {
    const { classGroupId } = query;

    // 1. Get relevant invoice IDs from Link table
    const linkWhere: Prisma.ClassBillingInvoiceLinkWhereInput = {
      tenantId,
      workspaceId,
    };

    if (classGroupId) {
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: {
          tenantId,
          workspaceId,
          classGroupId,
          isActive: true,
        },
        select: { payerClientId: true },
      });
      const payerIds = [...new Set(enrollments.map((e) => e.payerClientId))];
      linkWhere.OR = [{ classGroupId }, { classGroupId: null, payerClientId: { in: payerIds } }];
    }

    const links = await this.prisma.classBillingInvoiceLink.findMany({
      where: linkWhere,
      select: { invoiceId: true },
    });

    const invoiceIds = links.map((l) => l.invoiceId);

    if (invoiceIds.length === 0) {
      return { count: 0 };
    }

    // 2. Count provided invoices that are overdue
    // status=ISSUED,SENT & overdue=true (dueDate < now)
    const count = await this.prisma.invoice.count({
      where: {
        id: { in: invoiceIds },
        tenantId,
        status: { in: ["ISSUED", "SENT"] },
        dueDate: { lt: new Date() },
      },
    });

    return { count };
  }
}
