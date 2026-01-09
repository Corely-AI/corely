export interface ReportingQueryPort {
  countExpenses(tenantId: string): Promise<number>;
}

export const REPORTING_QUERY_PORT = "reporting/reporting-query";
