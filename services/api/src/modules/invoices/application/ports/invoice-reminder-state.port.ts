export type InvoiceReminderStateRecord = {
  id: string;
  tenantId: string;
  workspaceId: string;
  invoiceId: string;
  remindersSent: number;
  nextReminderAt: Date | null;
  lastReminderAt: Date | null;
  lockedAt: Date | null;
  lockedBy: string | null;
};

export type InitReminderStateInput = {
  id: string;
  tenantId: string;
  workspaceId: string;
  invoiceId: string;
  nextReminderAt: Date | null;
};

export type ClaimReminderOptions = {
  limit: number;
  lockId: string;
  lockTtlMs: number;
};

export interface InvoiceReminderStatePort {
  findByInvoice(tenantId: string, invoiceId: string): Promise<InvoiceReminderStateRecord | null>;
  upsertInitialState(input: InitReminderStateInput): Promise<InvoiceReminderStateRecord>;
  claimDueReminders(
    tenantId: string,
    workspaceId: string,
    now: Date,
    options: ClaimReminderOptions
  ): Promise<InvoiceReminderStateRecord[]>;
  releaseLock(tenantId: string, reminderId: string, lockId: string): Promise<void>;
  markReminderSent(params: {
    tenantId: string;
    reminderId: string;
    lockId: string;
    remindersSent: number;
    lastReminderAt: Date;
    nextReminderAt: Date | null;
  }): Promise<void>;
  markStopped(params: { tenantId: string; reminderId: string; lockId: string }): Promise<void>;
}

export const INVOICE_REMINDER_STATE_PORT = "invoices/reminder-state";
