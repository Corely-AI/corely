import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { ListClassGroupsInputSchema } from "./class-group.schema";
import { ListClassSessionsInputSchema } from "./session.schema";
import { ListEnrollmentsInputSchema } from "./enrollment.schema";
import { ClassSessionStatusSchema, ClassAttendanceStatusSchema } from "./classes.types";

export const ClassesListClassGroupsToolInputSchema = ListClassGroupsInputSchema.extend({
  activeOnly: z.boolean().optional(),
  teacherId: z.string().optional(),
});
export type ClassesListClassGroupsToolInput = z.infer<typeof ClassesListClassGroupsToolInputSchema>;

export const ClassesListSessionsToolInputSchema = ListClassSessionsInputSchema.extend({
  dateFrom: utcInstantSchema,
  dateTo: utcInstantSchema,
  status: ClassSessionStatusSchema.optional(),
});
export type ClassesListSessionsToolInput = z.infer<typeof ClassesListSessionsToolInputSchema>;

export const ClassesGetSessionDetailToolInputSchema = z.object({
  sessionId: z.string().min(1),
});
export type ClassesGetSessionDetailToolInput = z.infer<
  typeof ClassesGetSessionDetailToolInputSchema
>;

export const ClassesListNeedsAttentionSessionsToolInputSchema = z.object({
  dateFrom: utcInstantSchema.optional(),
  dateTo: utcInstantSchema.optional(),
  classGroupId: z.string().optional(),
});
export type ClassesListNeedsAttentionSessionsToolInput = z.infer<
  typeof ClassesListNeedsAttentionSessionsToolInputSchema
>;

export const ClassesGetClassRosterToolInputSchema = z.object({
  classGroupId: z.string().min(1),
  includeInactive: z.boolean().optional().default(false),
});
export type ClassesGetClassRosterToolInput = z.infer<typeof ClassesGetClassRosterToolInputSchema>;

export const ClassesMarkSessionDoneToolInputSchema = z.object({
  sessionId: z.string().min(1),
});
export type ClassesMarkSessionDoneToolInput = z.infer<typeof ClassesMarkSessionDoneToolInputSchema>;

export const ClassesAttendanceUpdateToolItemSchema = z
  .object({
    enrollmentId: z.string().optional(),
    studentId: z.string().optional(),
    status: ClassAttendanceStatusSchema,
    billable: z.boolean().optional(),
    note: z.string().optional().nullable(),
  })
  .refine((item) => Boolean(item.enrollmentId || item.studentId), {
    message: "enrollmentId or studentId is required",
    path: ["enrollmentId"],
  });
export type ClassesAttendanceUpdateToolItem = z.infer<typeof ClassesAttendanceUpdateToolItemSchema>;

export const ClassesBulkUpsertAttendanceToolInputSchema = z.object({
  sessionId: z.string().min(1),
  items: z.array(ClassesAttendanceUpdateToolItemSchema).min(1),
  idempotencyKey: z.string().optional(),
});
export type ClassesBulkUpsertAttendanceToolInput = z.infer<
  typeof ClassesBulkUpsertAttendanceToolInputSchema
>;

export const ClassesClassRosterQuerySchema = ListEnrollmentsInputSchema.pick({
  classGroupId: true,
  isActive: true,
});
export type ClassesClassRosterQuery = z.infer<typeof ClassesClassRosterQuerySchema>;
