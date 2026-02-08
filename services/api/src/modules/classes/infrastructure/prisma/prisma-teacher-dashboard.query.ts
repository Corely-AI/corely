import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  TEACHER_DASHBOARD_QUERY,
  TeacherDashboardQueryPort,
} from "../../application/ports/teacher-dashboard-query.port";
import {
  TeacherDashboardSummaryQuery,
  TeacherDashboardSummaryResponse,
} from "@corely/contracts/classes";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { ClassSessionStatus } from "@corely/contracts/classes";

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

    // Determine the week range based on "this week" context or input range?
    // The prompt says "dateFrom" and "dateTo" are passed. But dashboard has "Today" and "This Week" tiles.
    // The query likely corresponds to the date range selected in header.
    // BUT the tiles need "Today" and "This Week" specific counts regardless of the selected range?
    // "Top tiles (summary) ... 1) Today's sessions 2) This week's sessions" -> These imply fixed ranges relative to NOW.
    // So I should calculate these independently of dateFrom/dateTo passed for the list.
    // However, the prompt says "GET /teacher/dashboard/summary ... Query params: dateFrom, dateTo".
    // I will assume the counts are standard "Today" and "Week" based on server time,
    // while "upcomingSessions" respects the dateFrom/dateTo (or usually future).
    // Prompt: "Left column: “Upcoming sessions” list (next 7 days)" -> Use dateFrom/dateTo for this?
    // Let's stick to the prompt structure.

    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const whereBase = {
      tenantId,
      workspaceId,
      ...(classGroupId ? { classGroupId } : {}),
    };

    // 1. Counts
    // Today
    const todayCount = await this.prisma.classSession.count({
      where: {
        ...whereBase,
        startsAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: { not: "CANCELLED" },
      },
    });

    // Week
    const weekCount = await this.prisma.classSession.count({
      where: {
        ...whereBase,
        startsAt: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: { not: "CANCELLED" },
      },
    });

    // Missing Attendance: Past sessions (done or passed start time) with NO attendance records
    // Optimization: This might differ based on how "Missing Attendance" is defined.
    // "sessions done but no attendance OR past sessions without attendance"
    // Prisma doesn't support easy "empty relation" check in count efficiently without some tricks or fetching.
    // session.attendance is a relation.
    // count({ where: { attendance: { none: {} }, startsAt: { lt: now } } })
    const missingAttendanceCount = await this.prisma.classSession.count({
      where: {
        ...whereBase,
        status: { not: "CANCELLED" },
        startsAt: { lt: now }, // Past
        attendance: {
          none: {}, // No attendance records
        },
      },
    });

    // Unfinished Past Sessions: Past sessions still PLANNED
    const unfinishedPastSessionsCount = await this.prisma.classSession.count({
      where: {
        ...whereBase,
        status: "PLANNED",
        startsAt: { lt: now },
      },
    });

    // 2. Upcoming Sessions (Next 7 days by default or usage of dateFrom/dateTo)
    // The prompt says "Left column: “Upcoming sessions” list (next 7 days)"
    // And request has dateFrom/dateTo. I will use dateFrom/dateTo filtering for the list.
    const upcomingSessions = await this.prisma.classSession.findMany({
      where: {
        ...whereBase,
        startsAt: {
          gte: new Date(dateFrom) < now ? now : new Date(dateFrom),
          lte: new Date(dateTo),
        },
        status: { not: "CANCELLED" },
      },
      orderBy: { startsAt: "asc" },
      include: {
        classGroup: { select: { name: true } },
      },
    });

    // 3. Needs Attention
    // Missing Attendance (Top 10)
    const missingAttendanceSessions = await this.prisma.classSession.findMany({
      where: {
        ...whereBase,
        status: { not: "CANCELLED" },
        startsAt: { lt: now },
        attendance: { none: {} },
      },
      orderBy: { startsAt: "desc" },
      take: 10,
      include: {
        classGroup: { select: { name: true } },
      },
    });

    // Unfinished (Top 10)
    const unfinishedPastSessions = await this.prisma.classSession.findMany({
      where: {
        ...whereBase,
        status: "PLANNED",
        startsAt: { lt: now },
      },
      orderBy: { startsAt: "asc" }, // Oldest first? or Newest? Usually oldest needs attention first.
      take: 10,
      include: {
        classGroup: { select: { name: true } },
      },
    });

    return {
      range: {
        dateFrom: new Date(dateFrom).toISOString(),
        dateTo: new Date(dateTo).toISOString(),
      },
      counts: {
        todaySessions: todayCount,
        weekSessions: weekCount,
        missingAttendance: missingAttendanceCount,
        unfinishedPastSessions: unfinishedPastSessionsCount,
      },
      upcomingSessions: upcomingSessions.map((s) => ({
        id: s.id,
        classGroupId: s.classGroupId,
        classGroupName: s.classGroup.name,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt?.toISOString(),
        status: s.status as ClassSessionStatus, // Cast generic string to enum
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
      },
    };
  }
}
