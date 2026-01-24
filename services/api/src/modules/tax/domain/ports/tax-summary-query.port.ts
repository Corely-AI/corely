export interface TaxSummaryTotals {
  incomeTotalCents: number;
  unpaidInvoicesCount: number;
  expensesTotalCents: number;
  expenseItemsToReviewCount: number;
}

export abstract class TaxSummaryQueryPort {
  abstract getTotals(workspaceId: string): Promise<TaxSummaryTotals>;
}
