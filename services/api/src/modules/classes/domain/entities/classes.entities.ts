export type ClassGroupStatus = "ACTIVE" | "ARCHIVED";
export type ClassGroupKind = "COHORT" | "DROP_IN" | "OFFICE_HOURS" | "WORKSHOP";
export type ClassGroupLifecycle = "DRAFT" | "PUBLISHED" | "RUNNING" | "ENDED" | "ARCHIVED";
export type ClassDeliveryMode = "ONLINE" | "HYBRID" | "IN_PERSON";
export type ClassGroupInstructorRole = "INSTRUCTOR" | "MENTOR" | "TA";

export type ClassSessionStatus = "PLANNED" | "DONE" | "CANCELLED";
export type ClassSessionType = "LECTURE" | "LAB" | "OFFICE_HOURS" | "REVIEW" | "DEMO_DAY";
export type MeetingProvider = "ZOOM" | "GOOGLE_MEET" | "TEAMS" | "OTHER";

export type EnrollmentStatus = "APPLIED" | "ENROLLED" | "DEFERRED" | "DROPPED" | "COMPLETED";
export type SeatType = "LEARNER" | "AUDITOR" | "SPONSORED";
export type EnrollmentSource = "SELF_SERVE" | "SALES" | "ADMIN" | "PARTNER";

export type ClassAttendanceStatus = "PRESENT" | "ABSENT" | "MAKEUP" | "EXCUSED";
export type ClassBillingRunStatus = "DRAFT" | "INVOICES_CREATED" | "LOCKED" | "FAILED";
export type ClassBillingMonthStrategy = "PREPAID_CURRENT_MONTH" | "ARREARS_PREVIOUS_MONTH";
export type ClassBillingBasis = "SCHEDULED_SESSIONS" | "ATTENDED_SESSIONS";
export type AttendanceMode = "MANUAL" | "AUTO_FULL";

export type ClassEnrollmentBillingPlanType =
  | "UPFRONT"
  | "INSTALLMENTS"
  | "INVOICE_NET"
  | "SUBSCRIPTION";

export type BillingInvoicePurpose = "DEPOSIT" | "INSTALLMENT" | "FINAL" | "ADHOC" | "MONTHLY_RUN";

export type MilestoneType = "PROJECT" | "ASSESSMENT" | "CHECKPOINT";
export type MilestoneCompletionStatus = "NOT_STARTED" | "SUBMITTED" | "PASSED" | "FAILED";

export type ClassResourceType = "RECORDING" | "DOC" | "LINK";
export type ClassResourceVisibility = "ENROLLED_ONLY" | "PUBLIC";

export type ClassesBillingSettings = {
  billingMonthStrategy: ClassBillingMonthStrategy;
  billingBasis: ClassBillingBasis;
  attendanceMode: AttendanceMode;
};

export type ClassProgramEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  levelTag?: string | null;
  expectedSessionsCount?: number | null;
  defaultTimezone?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassProgramSessionTemplateEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  programId: string;
  index: number;
  title?: string | null;
  defaultDurationMin?: number | null;
  type: ClassSessionType;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassProgramMilestoneTemplateEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  programId: string;
  title: string;
  type: MilestoneType;
  required: boolean;
  index: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassGroupEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  subject: string;
  level: string;
  defaultPricePerSession: number;
  currency: string;
  schedulePattern?: Record<string, unknown> | null;
  status: ClassGroupStatus;
  kind?: ClassGroupKind;
  lifecycle?: ClassGroupLifecycle;
  startAt?: Date | null;
  endAt?: Date | null;
  timezone?: string;
  capacity?: number | null;
  waitlistEnabled?: boolean;
  deliveryMode?: ClassDeliveryMode;
  communityUrl?: string | null;
  programId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassGroupInstructorEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  classGroupId: string;
  partyId: string;
  role: ClassGroupInstructorRole;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassSessionEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  classGroupId: string;
  startsAt: Date;
  endsAt?: Date | null;
  topic?: string | null;
  notes?: string | null;
  status: ClassSessionStatus;
  type?: ClassSessionType;
  meetingProvider?: MeetingProvider | null;
  meetingJoinUrl?: string | null;
  meetingExternalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassEnrollmentEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  classGroupId: string;
  studentClientId: string;
  payerClientId: string;
  payerPartyId?: string | null;
  status?: EnrollmentStatus;
  seatType?: SeatType;
  source?: EnrollmentSource;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  priceOverridePerSession?: number | null;
  priceCents?: number | null;
  currency?: string | null;
  discountCents?: number | null;
  discountLabel?: string | null;
  placementLevel?: string | null;
  placementGoal?: string | null;
  placementNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassEnrollmentBillingPlanEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  enrollmentId: string;
  type: ClassEnrollmentBillingPlanType;
  scheduleJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassAttendanceEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  sessionId: string;
  enrollmentId: string;
  status: ClassAttendanceStatus;
  billable: boolean;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassMonthlyBillingRunEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  month: string;
  billingMonthStrategy: ClassBillingMonthStrategy;
  billingBasis: ClassBillingBasis;
  billingSnapshot?: Record<string, unknown> | null;
  status: ClassBillingRunStatus;
  runId: string;
  generatedAt?: Date | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassBillingInvoiceLinkEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  billingRunId?: string | null;
  enrollmentId?: string | null;
  payerClientId: string;
  classGroupId?: string | null;
  invoiceId: string;
  idempotencyKey: string;
  purpose?: BillingInvoicePurpose;
  createdAt: Date;
};

export type ClassMilestoneEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  classGroupId: string;
  programMilestoneTemplateId?: string | null;
  title: string;
  type: MilestoneType;
  dueAt?: Date | null;
  required: boolean;
  index?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassMilestoneCompletionEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  milestoneId: string;
  enrollmentId: string;
  status: MilestoneCompletionStatus;
  score?: number | null;
  feedback?: string | null;
  gradedByPartyId?: string | null;
  gradedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClassGroupResourceEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  classGroupId: string;
  type: ClassResourceType;
  title: string;
  documentId?: string | null;
  url?: string | null;
  visibility: ClassResourceVisibility;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BillingPreviewLine = {
  classGroupId: string;
  classGroupName: string;
  sessions: number;
  priceCents: number;
  amountCents: number;
  currency: string;
};

export type BillingPreviewItem = {
  payerClientId: string;
  totalSessions: number;
  totalAmountCents: number;
  currency: string;
  lines: BillingPreviewLine[];
};
