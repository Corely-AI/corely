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

export const TeacherDashboardStudentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  classGroupId: z.string(),
  classGroupName: z.string(),
  studentName: z.string(),
});
export type TeacherDashboardStudent = z.infer<typeof TeacherDashboardStudentSchema>;

export const TeacherDashboardInvoiceSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),
  customerName: z.string(),
  amountDueCents: z.number().int(),
  currency: z.string(),
  dueDate: utcInstantSchema.nullable(),
  issuedAt: utcInstantSchema.nullable(),
});
export type TeacherDashboardInvoice = z.infer<typeof TeacherDashboardInvoiceSchema>;

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
    studentsMissingPayer: z.number().int().nonnegative(),
    unpaidInvoices: z.number().int().nonnegative(),
  }),
  upcomingSessions: z.array(TeacherDashboardSessionSchema),
  needsAttention: z.object({
    missingAttendanceSessions: z.array(TeacherDashboardSessionSchema),
    unfinishedPastSessions: z.array(TeacherDashboardSessionSchema),
    studentsMissingPayer: z.array(TeacherDashboardStudentSchema),
    unpaidInvoices: z.array(TeacherDashboardInvoiceSchema),
  }),
});
export type TeacherDashboardSummaryResponse = z.infer<typeof TeacherDashboardSummaryResponseSchema>;
