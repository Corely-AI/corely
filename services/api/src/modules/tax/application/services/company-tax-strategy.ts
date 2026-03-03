import { Injectable } from "@nestjs/common";
import type { TaxSummaryDto, TaxReportDto } from "@corely/contracts";
import {
  TaxComputationStrategy,
  type TaxStrategyContext,
  type TaxStrategyCapabilities,
} from "./tax-strategy";

/**
 * COMPANY Tax Strategy — DE VAT (v1)
 *
 * Implements VAT-only capabilities for company workspaces.
 * Corporate income tax is intentionally not included here (separate tax type, future).
 *
 * Capabilities:
 * - canFileVat: true (VAT returns)
 * - canPayVat: true (payment tracking)
 * - needsConsultant: true (GmbH/AG typically use a Steuerberater)
 * - supportsReverseCharge: true (common in B2B DE)
 * - supportsOss: false (future)
 */
@Injectable()
export class CompanyTaxStrategy implements TaxComputationStrategy {
  readonly strategyId = "COMPANY";

  readonly capabilities: TaxStrategyCapabilities = {
    canFileVat: true,
    canPayVat: true,
    needsConsultant: true,
    supportsReverseCharge: true,
    supportsOss: false,
  };

  async computeSummary(_ctx: TaxStrategyContext): Promise<TaxSummaryDto> {
    // DE VAT summary for COMPANY workspaces — placeholder until full implementation
    return {
      taxesToBePaidEstimatedCents: 0,
      configurationStatus: "NOT_APPLICABLE",
      warnings: [
        "Company VAT summary computation is in progress. VAT filings and payments are available.",
      ],
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
    // Will delegate to VAT-period logic in next iteration
    return [];
  }
}
