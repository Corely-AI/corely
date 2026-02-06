import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const ClassGroupStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type ClassGroupStatus = z.infer<typeof ClassGroupStatusSchema>;

export const ClassSessionStatusSchema = z.enum(["PLANNED", "DONE", "CANCELLED"]);
export type ClassSessionStatus = z.infer<typeof ClassSessionStatusSchema>;

export const ClassAttendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "MAKEUP", "EXCUSED"]);
export type ClassAttendanceStatus = z.infer<typeof ClassAttendanceStatusSchema>;

export const ClassBillingRunStatusSchema = z.enum([
  "DRAFT",
  "INVOICES_CREATED",
  "LOCKED",
  "FAILED",
]);
export type ClassBillingRunStatus = z.infer<typeof ClassBillingRunStatusSchema>;

export const ClassGroupSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  subject: z.string(),
  level: z.string(),
  defaultPricePerSession: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3),
  schedulePattern: z.unknown().optional().nullable(),
  status: ClassGroupStatusSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassGroup = z.infer<typeof ClassGroupSchema>;

export const ClassSessionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  classGroupId: z.string(),
  startsAt: utcInstantSchema,
  endsAt: utcInstantSchema.optional().nullable(),
  topic: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: ClassSessionStatusSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassSession = z.infer<typeof ClassSessionSchema>;

export const ClassEnrollmentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  classGroupId: z.string(),
  clientId: z.string(),
  startDate: localDateSchema.optional().nullable(),
  endDate: localDateSchema.optional().nullable(),
  isActive: z.boolean(),
  priceOverridePerSession: z.number().int().nonnegative().optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassEnrollment = z.infer<typeof ClassEnrollmentSchema>;

export const ClassAttendanceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  sessionId: z.string(),
  enrollmentId: z.string(),
  status: ClassAttendanceStatusSchema,
  billable: z.boolean(),
  note: z.string().optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassAttendance = z.infer<typeof ClassAttendanceSchema>;

export const ClassMonthlyBillingRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  status: ClassBillingRunStatusSchema,
  runId: z.string(),
  generatedAt: utcInstantSchema.optional().nullable(),
  createdByUserId: z.string(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassMonthlyBillingRun = z.infer<typeof ClassMonthlyBillingRunSchema>;

export const ClassBillingInvoiceLinkSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  billingRunId: z.string(),
  clientId: z.string(),
  invoiceId: z.string(),
  idempotencyKey: z.string(),
  createdAt: utcInstantSchema,
});
export type ClassBillingInvoiceLink = z.infer<typeof ClassBillingInvoiceLinkSchema>;
