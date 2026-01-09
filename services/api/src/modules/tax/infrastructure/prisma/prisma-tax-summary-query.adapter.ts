import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { TaxSummaryQueryPort, type TaxSummaryTotals } from "../../domain/ports";

@Injectable()
export class PrismaTaxSummaryQueryAdapter extends TaxSummaryQueryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTotals(tenantId: string): Promise<TaxSummaryTotals> {
    const [incomeRow] = await this.prisma.$queryRaw<Array<{ total: bigint | null }>>`
      SELECT SUM(l."qty" * l."unitPriceCents") AS total
      FROM "InvoiceLine" l
      INNER JOIN "Invoice" i ON i."id" = l."invoiceId"
      WHERE i."tenantId" = ${tenantId} AND i."status" IN ('ISSUED','SENT','PAID')
    `;

    const incomeTotalCents = incomeRow?.total ? Number(incomeRow.total) : 0;

    const unpaidInvoicesCount = await this.prisma.invoice.count({
      where: { tenantId, status: { in: ["DRAFT", "ISSUED", "SENT"] as any } },
    });

    const expenseAggregation = await this.prisma.expense.aggregate({
      where: { tenantId, archivedAt: null },
      _sum: { totalAmountCents: true },
    });

    const expenseItemsToReviewCount = await this.prisma.expense.count({
      where: { tenantId, status: { in: ["DRAFT", "SUBMITTED"] as any } },
    });

    return {
      incomeTotalCents,
      unpaidInvoicesCount,
      expensesTotalCents: expenseAggregation._sum.totalAmountCents ?? 0,
      expenseItemsToReviewCount,
    };
  }
}
