import { z } from "zod";
import { ClassAttendanceSchema, ClassAttendanceStatusSchema } from "./classes.types";

export const AttendanceItemInputSchema = z.object({
  enrollmentId: z.string(),
  status: ClassAttendanceStatusSchema,
  billable: z.boolean().optional(),
  note: z.string().optional().nullable(),
});
export type AttendanceItemInput = z.infer<typeof AttendanceItemInputSchema>;

export const BulkUpsertAttendanceInputSchema = z.object({
  items: z.array(AttendanceItemInputSchema).min(1),
  idempotencyKey: z.string().optional(),
});
export type BulkUpsertAttendanceInput = z.infer<typeof BulkUpsertAttendanceInputSchema>;

export const GetSessionAttendanceOutputSchema = z.object({
  items: z.array(ClassAttendanceSchema),
  locked: z.boolean().optional(),
});
export type GetSessionAttendanceOutput = z.infer<typeof GetSessionAttendanceOutputSchema>;
