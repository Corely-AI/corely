/**
 * Prisma implementation of GiftThresholdQueryPort
 *
 * Queries cumulative gift totals per recipient per calendar year.
 * Uses the raw `deductibilityMeta->>'recipient'` JSON path for the gift category.
 */

import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { GiftThresholdQueryPort } from "../../application/ports/gift-threshold-query.port";

@Injectable()
export class PrismaGiftThresholdQueryAdapter implements GiftThresholdQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async sumGiftsByRecipientForYear(params: {
    tenantId: string;
    recipient: string;
    year: number;
    excludeExpenseId?: string;
  }): Promise<number> {
    const { tenantId, recipient, year, excludeExpenseId } = params;

    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);

    let result: Array<{ total: bigint }>;

    if (excludeExpenseId) {
      result = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COALESCE(SUM("totalAmountCents"), 0)::bigint AS total
        FROM "billing"."Expense"
        WHERE "tenantId" = ${tenantId}
          AND "archivedAt" IS NULL
          AND "category" = 'GIFTS_BUSINESS_PARTNER'
          AND "expenseDate" >= ${startOfYear}
          AND "expenseDate" < ${startOfNextYear}
          AND "deductibilityMeta"->>'recipient' = ${recipient}
          AND "id" != ${excludeExpenseId}
      `;
    } else {
      result = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COALESCE(SUM("totalAmountCents"), 0)::bigint AS total
        FROM "billing"."Expense"
        WHERE "tenantId" = ${tenantId}
          AND "archivedAt" IS NULL
          AND "category" = 'GIFTS_BUSINESS_PARTNER'
          AND "expenseDate" >= ${startOfYear}
          AND "expenseDate" < ${startOfNextYear}
          AND "deductibilityMeta"->>'recipient' = ${recipient}
      `;
    }

    return Number(result[0]?.total ?? 0);
  }
}
