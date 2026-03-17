import { Injectable } from "@nestjs/common";
import { TaxSnapshotRepoPort } from "../../domain/ports";
import {
  TaxEurSourcePort,
  type TaxEurSourceInput,
  type TaxEurSourceTotals,
} from "../../application/ports/tax-eur-source.port";

@Injectable()
export class TaxSnapshotEurSourceAdapter extends TaxEurSourcePort {
  constructor(private readonly snapshotRepo: TaxSnapshotRepoPort) {
    super();
  }

  async getEurTotals(input: TaxEurSourceInput): Promise<TaxEurSourceTotals> {
    const periodStart = new Date(Date.UTC(input.year, 0, 1, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(input.year + 1, 0, 1, 0, 0, 0, 0) - 1);

    const [incomeSnapshots, expenseSnapshots] = await Promise.all([
      this.snapshotRepo.findByPeriod(input.workspaceId, periodStart, periodEnd, "INVOICE", {
        invoiceDateMode: "payment",
      }),
      this.snapshotRepo.findByPeriod(input.workspaceId, periodStart, periodEnd, "EXPENSE"),
    ]);

    const incomeByCategory: Record<string, number> = {
      "income.sales": 0,
    };
    const expenseByCategory: Record<string, number> = {};

    for (const snapshot of incomeSnapshots) {
      incomeByCategory["income.sales"] += snapshot.subtotalAmountCents;
    }

    for (const snapshot of expenseSnapshots) {
      const categoryKey = this.normalizeExpenseCategory(snapshot.category);
      expenseByCategory[categoryKey] =
        (expenseByCategory[categoryKey] ?? 0) + snapshot.subtotalAmountCents;
    }

    const currency = incomeSnapshots[0]?.currency ?? expenseSnapshots[0]?.currency ?? "EUR";

    return {
      currency,
      incomeByCategory,
      expenseByCategory,
    };
  }

  private normalizeExpenseCategory(category: string | undefined): string {
    if (!category || category.trim().length === 0) {
      return "expense.other";
    }
    const normalized = category
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized.length > 0 ? `expense.${normalized}` : "expense.other";
  }
}
