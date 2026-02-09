import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  InvoiceEmailDeliveryRepoPort,
  InvoiceEmailDelivery,
  InvoiceEmailDeliveryStatus,
} from "@corely/kernel";

@Injectable()
export class PrismaInvoiceEmailDeliveryAdapter implements InvoiceEmailDeliveryRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<InvoiceEmailDelivery | null> {
    const row = await this.prisma.invoiceEmailDelivery.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey,
        },
      },
    });
    return (row as InvoiceEmailDelivery) || null;
  }

  async findById(tenantId: string, deliveryId: string): Promise<InvoiceEmailDelivery | null> {
    const row = await this.prisma.invoiceEmailDelivery.findUnique({
      where: { id: deliveryId },
    });
    // Check tenantId if needed, though usually id is global
    if (row && row.tenantId !== tenantId) {
      return null;
    }
    return (row as InvoiceEmailDelivery) || null;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<InvoiceEmailDelivery | null> {
    const row = await this.prisma.invoiceEmailDelivery.findFirst({
      where: { providerMessageId },
    });
    return (row as InvoiceEmailDelivery) || null;
  }

  async create(
    delivery: Omit<InvoiceEmailDelivery, "createdAt" | "updatedAt">
  ): Promise<InvoiceEmailDelivery> {
    const row = await this.prisma.invoiceEmailDelivery.create({
      data: {
        id: delivery.id,
        tenantId: delivery.tenantId,
        invoiceId: delivery.invoiceId,
        to: delivery.to,
        status: delivery.status,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId || null,
        idempotencyKey: delivery.idempotencyKey,
        lastError: delivery.lastError || null,
      },
    });
    return row as InvoiceEmailDelivery;
  }

  async updateStatus(
    tenantId: string,
    deliveryId: string,
    status: InvoiceEmailDeliveryStatus,
    opts?: {
      providerMessageId?: string | null;
      lastError?: string | null;
    }
  ): Promise<void> {
    await this.prisma.invoiceEmailDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        providerMessageId: opts?.providerMessageId ?? null,
        lastError: opts?.lastError ?? null,
      },
    });
  }

  async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: InvoiceEmailDeliveryStatus,
    opts?: { lastError?: string | null }
  ): Promise<void> {
    await this.prisma.invoiceEmailDelivery.updateMany({
      where: { providerMessageId },
      data: {
        status,
        lastError: opts?.lastError ?? null,
      },
    });
  }
}
