export type InvoiceEmailDeliveryStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "BOUNCED"
  | "FAILED"
  | "DELAYED";

export interface InvoiceEmailDelivery {
  id: string;
  tenantId: string;
  invoiceId: string;
  to: string;
  status: InvoiceEmailDeliveryStatus;
  provider: string;
  providerMessageId?: string | null;
  idempotencyKey: string;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceEmailDeliveryRepoPort {
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<InvoiceEmailDelivery | null>;

  findById(tenantId: string, deliveryId: string): Promise<InvoiceEmailDelivery | null>;

  findByProviderMessageId(providerMessageId: string): Promise<InvoiceEmailDelivery | null>;

  create(
    delivery: Omit<InvoiceEmailDelivery, "createdAt" | "updatedAt">
  ): Promise<InvoiceEmailDelivery>;

  updateStatus(
    tenantId: string,
    deliveryId: string,
    status: InvoiceEmailDeliveryStatus,
    opts?: {
      providerMessageId?: string | null;
      lastError?: string | null;
    }
  ): Promise<void>;

  updateStatusByProviderMessageId(
    providerMessageId: string,
    status: InvoiceEmailDeliveryStatus,
    opts?: { lastError?: string | null }
  ): Promise<void>;
}
