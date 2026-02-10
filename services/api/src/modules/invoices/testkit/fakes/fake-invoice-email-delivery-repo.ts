import {
  type InvoiceEmailDeliveryRepoPort,
  type InvoiceEmailDelivery,
  type InvoiceEmailDeliveryStatus,
} from "@corely/kernel";

export class FakeInvoiceEmailDeliveryRepository implements InvoiceEmailDeliveryRepoPort {
  deliveries: InvoiceEmailDelivery[] = [];

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<InvoiceEmailDelivery | null> {
    return (
      this.deliveries.find((d) => d.tenantId === tenantId && d.idempotencyKey === idempotencyKey) ??
      null
    );
  }

  async findById(tenantId: string, deliveryId: string): Promise<InvoiceEmailDelivery | null> {
    return this.deliveries.find((d) => d.id === deliveryId && d.tenantId === tenantId) ?? null;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<InvoiceEmailDelivery | null> {
    return this.deliveries.find((d) => d.providerMessageId === providerMessageId) ?? null;
  }

  async create(
    delivery: Omit<InvoiceEmailDelivery, "createdAt" | "updatedAt">
  ): Promise<InvoiceEmailDelivery> {
    const newDelivery: InvoiceEmailDelivery = {
      ...delivery,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.deliveries.push(newDelivery);
    return newDelivery;
  }

  async updateStatus(
    tenantId: string,
    deliveryId: string,
    status: InvoiceEmailDeliveryStatus,
    opts?: { providerMessageId?: string | null; lastError?: string | null }
  ): Promise<void> {
    const delivery = this.deliveries.find((d) => d.id === deliveryId && d.tenantId === tenantId);
    if (delivery) {
      delivery.status = status;
      if (opts?.providerMessageId !== undefined) {
        delivery.providerMessageId = opts.providerMessageId;
      }
      if (opts?.lastError !== undefined) {
        delivery.lastError = opts.lastError;
      }
      delivery.updatedAt = new Date();
    }
  }

  async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: InvoiceEmailDeliveryStatus,
    opts?: { lastError?: string | null }
  ): Promise<void> {
    const delivery = this.deliveries.find((d) => d.providerMessageId === providerMessageId);
    if (delivery) {
      delivery.status = status;
      if (opts?.lastError !== undefined) {
        delivery.lastError = opts.lastError;
      }
      delivery.updatedAt = new Date();
    }
  }
}
