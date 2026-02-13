export interface InvoiceCopilotRateLimitPort {
  countDraftsSince(params: { tenantId: string; userId: string; since: Date }): Promise<number>;
}

export const INVOICE_COPILOT_RATE_LIMIT_PORT = "invoices/copilot-rate-limit-port";
