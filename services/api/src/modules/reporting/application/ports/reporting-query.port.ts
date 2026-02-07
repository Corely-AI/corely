import type {
  PLSummary,
  VATSummary,
  ExciseSummary,
  InventoryBalance,
  ExpiryAlerts,
  ImportActivity,
} from "@corely/contracts";

export interface ReportingQueryPort {
  countExpenses(tenantId: string): Promise<number>;

  // Monthly Pack queries
  getPLSummary(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string
  ): Promise<PLSummary>;

  getVATSummary(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string
  ): Promise<VATSummary>;

  getExciseSummary(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string
  ): Promise<ExciseSummary>;

  getInventoryBalance(
    tenantId: string,
    asOfDate: Date,
    currency: string
  ): Promise<InventoryBalance>;

  getExpiryAlerts(tenantId: string, asOfDate: Date): Promise<ExpiryAlerts>;

  getImportActivity(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string
  ): Promise<ImportActivity>;
}

export const REPORTING_QUERY_PORT = "reporting/reporting-query";
