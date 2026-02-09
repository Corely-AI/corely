import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaClassesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findInvoiceForEmail(
    tenantId: string,
    invoiceId: string
  ): Promise<{ customerEmail: string | null; customerLocale: string | null } | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      return null;
    }

    // 1. Try invoice snapshot email
    if (invoice.billToEmail) {
      return { customerEmail: invoice.billToEmail, customerLocale: null };
    }

    // 2. Try customer party email
    if (invoice.customerPartyId) {
      const party = await this.prisma.party.findFirst({
        where: { id: invoice.customerPartyId, tenantId },
        include: {
          contactPoints: {
            where: { type: "EMAIL" },
            orderBy: { isPrimary: "desc" },
          },
        },
      });

      if (party && party.contactPoints.length > 0) {
        return {
          customerEmail: party.contactPoints[0].value,
          customerLocale: null, // Locale not currently on Party
        };
      }
    }

    return { customerEmail: null, customerLocale: null };
  }
}
