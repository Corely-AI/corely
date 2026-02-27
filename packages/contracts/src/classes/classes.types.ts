import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const ClassGroupStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type ClassGroupStatus = z.infer<typeof ClassGroupStatusSchema>;

export const ClassGroupKindSchema = z.enum(["COHORT", "DROP_IN", "OFFICE_HOURS", "WORKSHOP"]);
export type ClassGroupKind = z.infer<typeof ClassGroupKindSchema>;

export const ClassGroupLifecycleSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "RUNNING",
  "ENDED",
  "ARCHIVED",
]);
export type ClassGroupLifecycle = z.infer<typeof ClassGroupLifecycleSchema>;

export const ClassDeliveryModeSchema = z.enum(["ONLINE", "HYBRID", "IN_PERSON"]);
export type ClassDeliveryMode = z.infer<typeof ClassDeliveryModeSchema>;

export const ClassGroupInstructorRoleSchema = z.enum(["INSTRUCTOR", "MENTOR", "TA"]);
export type ClassGroupInstructorRole = z.infer<typeof ClassGroupInstructorRoleSchema>;

export const ClassSessionStatusSchema = z.enum(["PLANNED", "DONE", "CANCELLED"]);
export type ClassSessionStatus = z.infer<typeof ClassSessionStatusSchema>;

export const ClassSessionTypeSchema = z.enum([
  "LECTURE",
  "LAB",
  "OFFICE_HOURS",
  "REVIEW",
  "DEMO_DAY",
]);
export type ClassSessionType = z.infer<typeof ClassSessionTypeSchema>;

export const MeetingProviderSchema = z.enum(["ZOOM", "GOOGLE_MEET", "TEAMS", "OTHER"]);
export type MeetingProvider = z.infer<typeof MeetingProviderSchema>;

export const ClassEnrollmentStatusSchema = z.enum([
  "APPLIED",
  "ENROLLED",
  "DEFERRED",
  "DROPPED",
  "COMPLETED",
]);
export type ClassEnrollmentStatus = z.infer<typeof ClassEnrollmentStatusSchema>;

export const SeatTypeSchema = z.enum(["LEARNER", "AUDITOR", "SPONSORED"]);
export type SeatType = z.infer<typeof SeatTypeSchema>;

export const EnrollmentSourceSchema = z.enum(["SELF_SERVE", "SALES", "ADMIN", "PARTNER"]);
export type EnrollmentSource = z.infer<typeof EnrollmentSourceSchema>;

export const ClassAttendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "MAKEUP", "EXCUSED"]);
export type ClassAttendanceStatus = z.infer<typeof ClassAttendanceStatusSchema>;

export const ClassBillingRunStatusSchema = z.enum([
  "DRAFT",
  "INVOICES_CREATED",
  "LOCKED",
  "FAILED",
]);
export type ClassBillingRunStatus = z.infer<typeof ClassBillingRunStatusSchema>;

export const ClassBillingMonthStrategySchema = z.enum([
  "PREPAID_CURRENT_MONTH",
  "ARREARS_PREVIOUS_MONTH",
]);
export type ClassBillingMonthStrategy = z.infer<typeof ClassBillingMonthStrategySchema>;

export const ClassBillingBasisSchema = z.enum(["SCHEDULED_SESSIONS", "ATTENDED_SESSIONS"]);
export type ClassBillingBasis = z.infer<typeof ClassBillingBasisSchema>;

export const BillingPlanTypeSchema = z.enum([
  "UPFRONT",
  "INSTALLMENTS",
  "INVOICE_NET",
  "SUBSCRIPTION",
]);
export type BillingPlanType = z.infer<typeof BillingPlanTypeSchema>;

export const BillingInvoicePurposeSchema = z.enum([
  "DEPOSIT",
  "INSTALLMENT",
  "FINAL",
  "ADHOC",
  "MONTHLY_RUN",
]);
export type BillingInvoicePurpose = z.infer<typeof BillingInvoicePurposeSchema>;

export const MilestoneTypeSchema = z.enum(["PROJECT", "ASSESSMENT", "CHECKPOINT"]);
export type MilestoneType = z.infer<typeof MilestoneTypeSchema>;

export const MilestoneCompletionStatusSchema = z.enum([
  "NOT_STARTED",
  "SUBMITTED",
  "PASSED",
  "FAILED",
]);
export type MilestoneCompletionStatus = z.infer<typeof MilestoneCompletionStatusSchema>;

export const ClassResourceTypeSchema = z.enum(["RECORDING", "DOC", "LINK"]);
export type ClassResourceType = z.infer<typeof ClassResourceTypeSchema>;

export const ClassResourceVisibilitySchema = z.enum(["ENROLLED_ONLY", "PUBLIC"]);
export type ClassResourceVisibility = z.infer<typeof ClassResourceVisibilitySchema>;

export const ClassBillingMonthStatusSchema = z.enum([
  "OPEN",
  "DRAFT",
  "INVOICES_CREATED",
  "LOCKED",
  "FAILED",
]);
export type ClassBillingMonthStatus = z.infer<typeof ClassBillingMonthStatusSchema>;

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
  kind: ClassGroupKindSchema.default("COHORT"),
  lifecycle: ClassGroupLifecycleSchema.default("DRAFT"),
  startAt: utcInstantSchema.optional().nullable(),
  endAt: utcInstantSchema.optional().nullable(),
  timezone: z.string().default("UTC"),
  capacity: z.number().int().positive().optional().nullable(),
  waitlistEnabled: z.boolean().default(false),
  deliveryMode: ClassDeliveryModeSchema.default("ONLINE"),
  communityUrl: z.string().url().optional().nullable(),
  programId: z.string().optional().nullable(),
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
  type: ClassSessionTypeSchema.default("LECTURE"),
  meetingProvider: MeetingProviderSchema.optional().nullable(),
  meetingJoinUrl: z.string().url().optional().nullable(),
  meetingExternalId: z.string().optional().nullable(),
  billingMonthStatus: ClassBillingMonthStatusSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassSession = z.infer<typeof ClassSessionSchema>;

export const ClassEnrollmentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  classGroupId: z.string(),
  studentClientId: z.string(),
  payerClientId: z.string(),
  payerPartyId: z.string().optional().nullable(),
  status: ClassEnrollmentStatusSchema.default("ENROLLED"),
  seatType: SeatTypeSchema.default("LEARNER"),
  source: EnrollmentSourceSchema.default("ADMIN"),
  startDate: localDateSchema.optional().nullable(),
  endDate: localDateSchema.optional().nullable(),
  isActive: z.boolean(),
  priceOverridePerSession: z.number().int().nonnegative().optional().nullable(),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
  discountCents: z.number().int().nonnegative().optional().nullable(),
  discountLabel: z.string().optional().nullable(),
  placementLevel: z.string().optional().nullable(),
  placementGoal: z.string().optional().nullable(),
  placementNote: z.string().optional().nullable(),
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
  billingMonthStrategy: ClassBillingMonthStrategySchema,
  billingBasis: ClassBillingBasisSchema,
  billingSnapshot: z.unknown().optional().nullable(),
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
  billingRunId: z.string().optional().nullable(),
  enrollmentId: z.string().optional().nullable(),
  payerClientId: z.string(),
  classGroupId: z.string().optional().nullable(),
  invoiceId: z.string(),
  idempotencyKey: z.string(),
  purpose: BillingInvoicePurposeSchema.default("MONTHLY_RUN"),
  createdAt: utcInstantSchema,
});
export type ClassBillingInvoiceLink = z.infer<typeof ClassBillingInvoiceLinkSchema>;

export const ClassProgramSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  levelTag: z.string().optional().nullable(),
  expectedSessionsCount: z.number().int().positive().optional().nullable(),
  defaultTimezone: z.string().optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassProgram = z.infer<typeof ClassProgramSchema>;

export const ClassProgramSessionTemplateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  programId: z.string(),
  index: z.number().int().positive(),
  title: z.string().optional().nullable(),
  defaultDurationMin: z.number().int().positive().optional().nullable(),
  type: ClassSessionTypeSchema.default("LECTURE"),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassProgramSessionTemplate = z.infer<typeof ClassProgramSessionTemplateSchema>;

export const ClassProgramMilestoneTemplateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  programId: z.string(),
  title: z.string(),
  type: MilestoneTypeSchema.default("CHECKPOINT"),
  required: z.boolean().default(true),
  index: z.number().int().positive(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassProgramMilestoneTemplate = z.infer<typeof ClassProgramMilestoneTemplateSchema>;

export const ClassGroupInstructorSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  classGroupId: z.string(),
  partyId: z.string(),
  role: ClassGroupInstructorRoleSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassGroupInstructor = z.infer<typeof ClassGroupInstructorSchema>;

export const ClassEnrollmentBillingPlanSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  enrollmentId: z.string(),
  type: BillingPlanTypeSchema,
  scheduleJson: z.unknown(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassEnrollmentBillingPlan = z.infer<typeof ClassEnrollmentBillingPlanSchema>;

export const ClassMilestoneSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  classGroupId: z.string(),
  programMilestoneTemplateId: z.string().optional().nullable(),
  title: z.string(),
  type: MilestoneTypeSchema,
  dueAt: utcInstantSchema.optional().nullable(),
  required: z.boolean(),
  index: z.number().int().optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassMilestone = z.infer<typeof ClassMilestoneSchema>;

export const ClassMilestoneCompletionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  milestoneId: z.string(),
  enrollmentId: z.string(),
  status: MilestoneCompletionStatusSchema,
  score: z.number().int().optional().nullable(),
  feedback: z.string().optional().nullable(),
  gradedByPartyId: z.string().optional().nullable(),
  gradedAt: utcInstantSchema.optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassMilestoneCompletion = z.infer<typeof ClassMilestoneCompletionSchema>;

export const ClassGroupResourceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  classGroupId: z.string(),
  type: ClassResourceTypeSchema,
  title: z.string(),
  documentId: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  visibility: ClassResourceVisibilitySchema.default("ENROLLED_ONLY"),
  sortOrder: z.number().int().nonnegative(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type ClassGroupResource = z.infer<typeof ClassGroupResourceSchema>;
