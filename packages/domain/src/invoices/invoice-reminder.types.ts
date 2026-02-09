export type InvoiceReminderPolicy = {
  startAfterDays: number;
  maxReminders: number;
  sendOnlyOnWeekdays: boolean;
};

export const DEFAULT_REMINDER_POLICY: InvoiceReminderPolicy = {
  startAfterDays: 7,
  maxReminders: 3,
  sendOnlyOnWeekdays: true,
};

export const normalizeReminderPolicy = (
  input?: Partial<InvoiceReminderPolicy> | null
): InvoiceReminderPolicy => ({
  startAfterDays: Math.max(0, input?.startAfterDays ?? DEFAULT_REMINDER_POLICY.startAfterDays),
  maxReminders: Math.max(0, input?.maxReminders ?? DEFAULT_REMINDER_POLICY.maxReminders),
  sendOnlyOnWeekdays: input?.sendOnlyOnWeekdays ?? DEFAULT_REMINDER_POLICY.sendOnlyOnWeekdays,
});

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
