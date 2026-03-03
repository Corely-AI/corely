import type { TaxSummaryDto, TaxReportDto } from "@corely/contracts";

/**
 * Capabilities object describing what a given tax strategy supports.
 * Used to gate UI actions and validate use-case preconditions.
 */
export interface TaxStrategyCapabilities {
  /** Can file VAT returns */
  canFileVat: boolean;
  /** Can record/mark VAT payments */
  canPayVat: boolean;
  /** Requires a tax consultant for advice (informational) */
  needsConsultant: boolean;
  /** Supports reverse charge on B2B cross-border transactions */
  supportsReverseCharge: boolean;
  /** Supports OSS (One-Stop-Shop) EU VAT returns (future) */
  supportsOss: boolean;
  /** Expected VAT filing frequency (if applicable) */
  vatFilingFrequency?: "MONTHLY" | "QUARTERLY" | "YEARLY";
}

export interface TaxStrategyContext {
  tenantId: string;
  workspaceId: string;
}

export interface TaxComputationStrategy {
  /** Stable identifier for this strategy (e.g., "PERSONAL", "COMPANY") */
  readonly strategyId: string;

  /** Capabilities advertised by this strategy */
  readonly capabilities: TaxStrategyCapabilities;

  computeSummary(ctx: TaxStrategyContext): Promise<TaxSummaryDto>;

  listReports(
    ctx: TaxStrategyContext,
    status: "upcoming" | "submitted",
    filters?: { group?: string | null; type?: string | null }
  ): Promise<TaxReportDto[]>;

  markSubmitted?(ctx: TaxStrategyContext, id: string): Promise<TaxReportDto>;
}
