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
}
