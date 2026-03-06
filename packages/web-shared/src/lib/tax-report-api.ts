import type * as Contracts from "@corely/contracts";
import { apiClient } from "./api-client";

export class TaxReportApi {
  async getAnnualIncomeSection(
    filingId: string,
    reportId: string
  ): Promise<Contracts.GetTaxReportSectionOutput> {
    return apiClient.get<Contracts.GetTaxReportSectionOutput>(
      `/tax/filings/${filingId}/reports/${reportId}/sections/annual-income`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async upsertAnnualIncomeSection(
    filingId: string,
    reportId: string,
    input: Contracts.UpsertAnnualIncomeSectionInput
  ): Promise<Contracts.UpsertTaxReportSectionOutput> {
    return apiClient.put<Contracts.UpsertTaxReportSectionOutput>(
      `/tax/filings/${filingId}/reports/${reportId}/sections/annual-income`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async validateEricReport(
    filingId: string,
    reportId: string
  ): Promise<Contracts.CreateTaxEricJobOutput> {
    return apiClient.post<Contracts.CreateTaxEricJobOutput>(
      `/tax/filings/${filingId}/reports/${reportId}/eric/validate`,
      {},
      {
        correlationId: apiClient.generateCorrelationId(),
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async submitEricReport(
    filingId: string,
    reportId: string
  ): Promise<Contracts.CreateTaxEricJobOutput> {
    return apiClient.post<Contracts.CreateTaxEricJobOutput>(
      `/tax/filings/${filingId}/reports/${reportId}/eric/submit`,
      {},
      {
        correlationId: apiClient.generateCorrelationId(),
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async getEricJob(
    filingId: string,
    reportId: string,
    jobId: string
  ): Promise<Contracts.GetTaxEricJobOutput> {
    return apiClient.get<Contracts.GetTaxEricJobOutput>(
      `/tax/filings/${filingId}/reports/${reportId}/eric/jobs/${jobId}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }
}

export const taxReportApi = new TaxReportApi();
