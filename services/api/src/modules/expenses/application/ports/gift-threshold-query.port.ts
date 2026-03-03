/**
 * Gift Threshold Query Port
 *
 * Read-only port that queries cumulative gift totals per recipient per year.
 * Implemented in the infrastructure layer (Prisma adapter).
 */

export interface GiftThresholdQueryPort {
  /**
   * Returns the total amount in cents of all GIFTS_BUSINESS_PARTNER expenses
   * already recorded for a given recipient (string identifier) within the
   * same tenant and calendar year, excluding the expense identified by
   * `excludeExpenseId` (used on updates to avoid counting the current expense).
   */
  sumGiftsByRecipientForYear(params: {
    tenantId: string;
    recipient: string;
    year: number;
    excludeExpenseId?: string;
  }): Promise<number>;
}

export const GIFT_THRESHOLD_QUERY_PORT = "expenses/gift-threshold-query-port";
