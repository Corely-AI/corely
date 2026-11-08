import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
const id = z.string().trim().min(1).max(160);
const timezone = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Invalid timezone");
export const StaffAbsenceRangeSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("full-day"),
        timezone,
        startDate: localDateSchema,
        endDate: localDateSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("partial-day"),
        timezone,
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
      })
      .strict(),
  ])
  .superRefine((range, ctx) => {
    const start =
      range.kind === "full-day" ? Date.parse(range.startDate) : Date.parse(range.startAt);
    const end = range.kind === "full-day" ? Date.parse(range.endDate) : Date.parse(range.endAt);
    if (!(start < end) || end - start > 366 * 86400000) {
      ctx.addIssue({ code: "custom", message: "Range must be positive and at most 366 days" });
    }
  });
export const StaffAbsenceFieldsSchema = z
  .object({
    range: StaffAbsenceRangeSchema,
    reason: z.string().trim().min(1).max(500),
    notes: z.string().trim().max(4000).nullable().default(null),
  })
  .strict();
export const RecordStaffAbsenceSchema = StaffAbsenceFieldsSchema;
export const CorrectStaffAbsenceSchema = StaffAbsenceFieldsSchema.extend({
  version: z.number().int().positive(),
});
export const CancelStaffAbsenceSchema = z.object({ version: z.number().int().positive() }).strict();
export const StaffAbsenceRevisionSchema = StaffAbsenceFieldsSchema.extend({
  version: z.number().int().positive(),
  status: z.enum(["approved", "cancelled"]),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  changedAt: z.string().datetime(),
  changedBy: id,
}).strict();
export const StaffAbsenceSchema = z
  .object({
    id,
    staffId: id,
    workspaceId: id,
    revisions: z.array(StaffAbsenceRevisionSchema).min(1).max(256),
  })
  .strict();
export const StaffAbsenceWindowQuerySchema = z
  .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.from) < Date.parse(v.to) &&
      Date.parse(v.to) - Date.parse(v.from) <= 62 * 86400000,
    "Range must be positive and at most 62 days"
  );
export const PersonnelAttachmentUploadSchema = z
  .object({
    version: z.number().int().positive(),
    filename: z.string().trim().min(1).max(160),
    contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "text/plain"]),
    base64: z
      .string()
      .min(4)
      .max(1400000)
      .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  })
  .strict();
export const PersonnelAttachmentSchema = z
  .object({
    documentId: id,
    filename: z.string(),
    contentType: z.string(),
    sizeBytes: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
  })
  .strict();
export type StaffAbsence = z.infer<typeof StaffAbsenceSchema>;
export type StaffAbsenceRevision = z.infer<typeof StaffAbsenceRevisionSchema>;
export type StaffAbsenceRange = z.infer<typeof StaffAbsenceRangeSchema>;
export type PersonnelAttachment = z.infer<typeof PersonnelAttachmentSchema>;
export interface PersonnelAttachmentOwner {
  tenantId: string;
  workspaceId: string;
  absenceId: string;
}
