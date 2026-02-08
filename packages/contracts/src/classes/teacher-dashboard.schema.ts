import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { ClassSessionStatusSchema } from "./classes.types";
import { AttendanceModeSchema } from "./settings.schema";

export const TeacherDashboardSummaryQuerySchema = z.object({
  dateFrom: utcInstantSchema,
  dateTo: utcInstantSchema,
  classGroupId: z.string().optional(),
});
export type TeacherDashboardSummaryQuery = z.infer<typeof TeacherDashboardSummaryQuerySchema>;

export const TeacherDashboardSessionSchema = z.object({
  id: z.string(),
  classGroupId: z.string(),
  classGroupName: z.string(),
  startsAt: utcInstantSchema,
  endsAt: utcInstantSchema.nullable().optional(),
  status: ClassSessionStatusSchema,
  topic: z.string().nullable().optional(),
});
export type TeacherDashboardSession = z.infer<typeof TeacherDashboardSessionSchema>;

export const TeacherDashboardSummaryResponseSchema = z.object({
  range: z.object({
    dateFrom: utcInstantSchema,
    dateTo: utcInstantSchema,
  }),
  attendanceMode: AttendanceModeSchema,
  counts: z.object({
    todaySessions: z.number().int().nonnegative(),
    weekSessions: z.number().int().nonnegative(),
    missingAttendance: z.number().int().nonnegative(),
    unfinishedPastSessions: z.number().int().nonnegative(),
  }),
  upcomingSessions: z.array(TeacherDashboardSessionSchema),
  needsAttention: z.object({
    missingAttendanceSessions: z.array(TeacherDashboardSessionSchema),
    unfinishedPastSessions: z.array(TeacherDashboardSessionSchema),
  }),
});
export type TeacherDashboardSummaryResponse = z.infer<typeof TeacherDashboardSummaryResponseSchema>;
