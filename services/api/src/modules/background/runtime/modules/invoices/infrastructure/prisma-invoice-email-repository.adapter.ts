import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";

@Injectable()
export class PrismaInvoiceEmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findInvoiceWithLines(tenantId: string, invoiceId: string) {
    return this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        lines: true,
        legalEntity: true,
      },
    });
  }

  async findWorkspaceSlug(workspaceId: string): Promise<string | null> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    return workspace?.slug ?? null;
  }

  async markInvoiceAsSent(tenantId: string, invoiceId: string, sentAt: Date): Promise<void> {
    await this.prisma.invoice.updateMany({
      where: {
        tenantId,
        id: invoiceId,
        status: "ISSUED",
      },
      data: {
        revision: { increment: 1 },
        status: "SENT",
        sentAt,
      },
    });
  }

  async isInvoiceCanceled(workspaceId: string, invoiceId: string): Promise<boolean> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: workspaceId, status: "CANCELED" },
      select: { id: true },
    });
    return invoice !== null;
  }
}
