export interface NotificationPort {
  sendInvoiceEmail(tenantId: string, payload: { invoiceId: string; to?: string }): Promise<void>;
}

export const NOTIFICATION_PORT = Symbol("NOTIFICATION_PORT");
