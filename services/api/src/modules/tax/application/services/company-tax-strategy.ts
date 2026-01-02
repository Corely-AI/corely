import { Injectable } from "@nestjs/common";
import type { TaxSummaryDto, TaxReportDto } from "@corely/contracts";
import { TaxComputationStrategy, type TaxStrategyContext } from "./tax-strategy";

@Injectable()
export class CompanyTaxStrategy implements TaxComputationStrategy {
  async computeSummary(_ctx: TaxStrategyContext): Promise<TaxSummaryDto> {
    return {
      taxesToBePaidEstimatedCents: 0,
      incomeTotalCents: 0,
      unpaidInvoicesCount: 0,
      expensesTotalCents: 0,
      expenseItemsToReviewCount: 0,
      upcomingReportCount: 0,
      upcomingReportsPreview: [],
      localTaxOfficeName: null,
      workspaceKind: "COMPANY",
    };
  }

  async listReports(
    _ctx: TaxStrategyContext,
    _status: "upcoming" | "submitted"
  ): Promise<TaxReportDto[]> {
    return [];
  }
}
