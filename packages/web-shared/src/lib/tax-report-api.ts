import type * as Contracts from "@corely/contracts";
import { apiClient } from "./api-client";

export class TaxReportApi {
  async listSections(
    filingId: string,
    reportId: string
  ): Promise<Contracts.ListTaxReportSectionsOutput> {
    return apiClient.get<Contracts.ListTaxReportSectionsOutput>(
      `/tax/filings/${filingId}/reports/${reportId}/sections`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getSection(
    filingId: string,
    reportId: string,
    sectionKey: Contracts.TaxReportSectionKey
  ): Promise<Contracts.GetTaxReportSectionOutput> {
    return apiClient.get<Contracts.GetTaxReportSectionOutput>(
      `/tax/filings/${filingId}/reports/${reportId}/sections/${sectionKey}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async upsertSection(
    filingId: string,
    reportId: string,
    sectionKey: Contracts.TaxReportSectionKey,
    input: Contracts.UpsertTaxReportSectionInput
  ): Promise<Contracts.UpsertTaxReportSectionOutput> {
    return apiClient.put<Contracts.UpsertTaxReportSectionOutput>(
      `/tax/filings/${filingId}/reports/${reportId}/sections/${sectionKey}`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async getAnnualIncomeSection(
    filingId: string,
    reportId: string
  ): Promise<Contracts.GetTaxReportSectionOutput> {
    return this.getSection(filingId, reportId, "annualIncome");
  }

  async upsertAnnualIncomeSection(
    filingId: string,
    reportId: string,
    input: Contracts.UpsertAnnualIncomeSectionInput
  ): Promise<Contracts.UpsertTaxReportSectionOutput> {
    return this.upsertSection(filingId, reportId, "annualIncome", input);
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
