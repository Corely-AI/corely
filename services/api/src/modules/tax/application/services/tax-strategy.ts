import type { TaxSummaryDto, TaxReportDto } from "@corely/contracts";

export interface TaxStrategyContext {
  tenantId: string;
  workspaceId: string;
}

export interface TaxComputationStrategy {
  computeSummary(ctx: TaxStrategyContext): Promise<TaxSummaryDto>;
  listReports(
    ctx: TaxStrategyContext,
    status: "upcoming" | "submitted",
    filters?: { group?: string | null; type?: string | null }
  ): Promise<TaxReportDto[]>;
  markSubmitted?(ctx: TaxStrategyContext, id: string): Promise<TaxReportDto>;
}
