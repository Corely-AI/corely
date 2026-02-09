import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";

@Injectable()
export class PrismaInvoiceEmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDelivery(deliveryId: string) {
    return this.prisma.invoiceEmailDelivery.findUnique({ where: { id: deliveryId } });
  }

  async findInvoiceWithLines(tenantId: string, invoiceId: string) {
    return this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        lines: true,
      },
    });
  }

  async createDelivery(
    data: {
      tenantId: string;
      invoiceId: string;
      to: string;
      idempotencyKey: string;
      provider?: string;
    },
    tx?: any
  ) {
    const client = tx ?? this.prisma;
    return client.invoiceEmailDelivery.create({
      data: {
        tenantId: data.tenantId,
        invoiceId: data.invoiceId,
        to: data.to,
        idempotencyKey: data.idempotencyKey,
        provider: data.provider ?? "resend",
        status: "QUEUED",
      },
    });
  }

  async findDeliveryByIdempotency(tenantId: string, idempotencyKey: string) {
    return this.prisma.invoiceEmailDelivery.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey,
        },
      },
    });
  }

  async markDeliverySent(params: {
    deliveryId: string;
    provider: string;
    providerMessageId?: string | null;
  }) {
    return this.prisma.invoiceEmailDelivery.update({
      where: { id: params.deliveryId },
      data: {
        status: "SENT",
        provider: params.provider,
        providerMessageId: params.providerMessageId ?? null,
      },
    });
  }

  async markDeliveryFailed(params: { deliveryId: string; error: string }) {
    return this.prisma.invoiceEmailDelivery.update({
      where: { id: params.deliveryId },
      data: {
        status: "FAILED",
        lastError: params.error,
      },
    });
  }
}
