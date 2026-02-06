import type { InvoiceReminderPolicy } from "../helpers/reminder-policy";

export interface InvoiceReminderSettingsPort {
  getPolicy(tenantId: string, workspaceId: string): Promise<InvoiceReminderPolicy>;
}

export const INVOICE_REMINDER_SETTINGS_PORT = "invoices/reminder-settings";
