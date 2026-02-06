export type ClassGroupStatus = "ACTIVE" | "ARCHIVED";
export type ClassSessionStatus = "PLANNED" | "DONE" | "CANCELLED";
export type ClassAttendanceStatus = "PRESENT" | "ABSENT" | "MAKEUP" | "EXCUSED";
export type ClassBillingRunStatus = "DRAFT" | "INVOICES_CREATED" | "LOCKED" | "FAILED";

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
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  priceOverridePerSession?: number | null;
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
  billingRunId: string;
  payerClientId: string;
  invoiceId: string;
  idempotencyKey: string;
  createdAt: Date;
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
