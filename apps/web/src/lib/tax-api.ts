/**
 * Tax API Client
 * Wrapper around tax endpoints for managing tax profiles, codes, calculations, and VAT reporting
 */

import type * as Contracts from "@corely/contracts";
import { apiClient } from "./api-client";
import { buildListQuery } from "./api-query-utils";

type PdfUrlResponse = {
  status: "PENDING" | "READY";
  downloadUrl?: string;
  expiresAt?: string;
};

export class TaxApi {
  async getProfile(): Promise<Contracts.TaxProfileDto | null> {
    const result = await apiClient.get<Contracts.GetTaxProfileOutput>("/tax/profile", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.profile;
  }

  async upsertProfile(
    input: Contracts.UpsertTaxProfileInput,
    idempotencyKey?: string
  ): Promise<Contracts.TaxProfileDto> {
    const result = await apiClient.put<Contracts.UpsertTaxProfileOutput>("/tax/profile", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.profile;
  }

  async listTaxCodes(): Promise<Contracts.TaxCodeDto[]> {
    const result = await apiClient.get<Contracts.ListTaxCodesOutput>("/tax/codes", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.codes;
  }

  async createTaxCode(
    input: Contracts.CreateTaxCodeInput,
    idempotencyKey?: string
  ): Promise<Contracts.TaxCodeDto> {
    const result = await apiClient.post<Contracts.CreateTaxCodeOutput>("/tax/codes", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.code;
  }

  async updateTaxCode(
    id: string,
    input: Contracts.UpdateTaxCodeInput,
    idempotencyKey?: string
  ): Promise<Contracts.TaxCodeDto> {
    const result = await apiClient.patch<Contracts.UpdateTaxCodeOutput>(`/tax/codes/${id}`, input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.code;
  }

  async listTaxRates(taxCodeId: string): Promise<Contracts.TaxRateDto[]> {
    const result = await apiClient.get<Contracts.ListTaxRatesOutput>(
      `/tax/rates?taxCodeId=${taxCodeId}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.rates;
  }

  async createTaxRate(
    input: Contracts.CreateTaxRateInput,
    idempotencyKey?: string
  ): Promise<Contracts.TaxRateDto> {
    const result = await apiClient.post<Contracts.CreateTaxRateOutput>("/tax/rates", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.rate;
  }

  async calculateTax(input: Contracts.CalculateTaxInput): Promise<Contracts.TaxBreakdownDto> {
    const result = await apiClient.post<Contracts.CalculateTaxOutput>("/tax/calculate", input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.breakdown;
  }

  async lockSnapshot(
    input: Contracts.LockTaxSnapshotInput,
    idempotencyKey?: string
  ): Promise<Contracts.TaxSnapshotDto> {
    const result = await apiClient.post<Contracts.LockTaxSnapshotOutput>(
      "/tax/snapshots/lock",
      input,
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.snapshot;
  }

  async getSummary(): Promise<Contracts.GetTaxSummaryOutput> {
    return apiClient.get<Contracts.GetTaxSummaryOutput>("/tax/summary", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listReports(
    status: "upcoming" | "submitted" = "upcoming"
  ): Promise<Contracts.ListTaxReportsOutput> {
    return apiClient.get<Contracts.ListTaxReportsOutput>(`/tax/reports?status=${status}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getReport(id: string): Promise<Contracts.TaxReportDto> {
    const result = await apiClient.get<{ report: Contracts.TaxReportDto }>(`/tax/reports/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.report;
  }

  async markReportSubmitted(id: string): Promise<Contracts.MarkTaxReportSubmittedOutput> {
    return apiClient.post<Contracts.MarkTaxReportSubmittedOutput>(
      `/tax/reports/${id}/mark-submitted`,
      {},
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async listVatPeriods(from?: string, to?: string): Promise<Contracts.ListVatPeriodsOutput> {
    const params = buildListQuery({ from, to });
    const url = params.toString() ? `/tax/periods?${params.toString()}` : "/tax/periods";

    return apiClient.get<Contracts.ListVatPeriodsOutput>(url, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listVatPeriodsByYear(
    year: number,
    type: Contracts.VatPeriodType = "VAT_QUARTERLY"
  ): Promise<Contracts.ListVatPeriodsOutput> {
    const params = buildListQuery({ year, type });
    return apiClient.get<Contracts.ListVatPeriodsOutput>(`/tax/periods?${params.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getVatPeriodSummary(key: string): Promise<Contracts.GetVatPeriodSummaryOutput> {
    return apiClient.get<Contracts.GetVatPeriodSummaryOutput>(`/tax/periods/${key}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getVatPeriodDetails(key: string): Promise<Contracts.GetVatPeriodDetailsOutput> {
    return apiClient.get<Contracts.GetVatPeriodDetailsOutput>(`/tax/periods/${key}/details`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async markVatPeriodSubmitted(
    key: string,
    input: Contracts.MarkVatPeriodSubmittedInput
  ): Promise<Contracts.MarkVatPeriodSubmittedOutput> {
    return apiClient.post<Contracts.MarkVatPeriodSubmittedOutput>(
      `/tax/reports/vat/quarterly/${key}/mark-submitted`,
      input,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async markVatPeriodNil(
    key: string,
    input: Contracts.MarkVatPeriodNilInput
  ): Promise<Contracts.MarkVatPeriodNilOutput> {
    return apiClient.post<Contracts.MarkVatPeriodNilOutput>(
      `/tax/reports/vat/quarterly/${key}/mark-nil`,
      input,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async archiveVatPeriod(
    key: string,
    input: Contracts.ArchiveVatPeriodInput
  ): Promise<Contracts.ArchiveVatPeriodOutput> {
    return apiClient.post<Contracts.ArchiveVatPeriodOutput>(
      `/tax/reports/vat/quarterly/${key}/archive`,
      input,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getVatPeriodPdfUrl(key: string): Promise<PdfUrlResponse> {
    return apiClient.get<PdfUrlResponse>(`/tax/reports/vat/quarterly/${key}/pdf-url`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getReportPdfUrl(id: string): Promise<PdfUrlResponse> {
    return apiClient.get<PdfUrlResponse>(`/tax/reports/${id}/pdf-url`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getCenter(input: Contracts.GetTaxCenterInput): Promise<Contracts.GetTaxCenterOutput> {
    const params = buildListQuery({ year: input.year, entityId: input.entityId });
    const url = params.toString() ? `/tax/center?${params.toString()}` : "/tax/center";

    return apiClient.get<Contracts.GetTaxCenterOutput>(url, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getCapabilities(): Promise<Contracts.GetTaxCapabilitiesResponse["capabilities"]> {
    const result = await apiClient.get<Contracts.GetTaxCapabilitiesResponse>("/tax/capabilities", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.capabilities;
  }

  async listFilings(input: Contracts.ListTaxFilingsInput): Promise<Contracts.ListTaxFilingsOutput> {
    const sort = Array.isArray(input.sort) ? input.sort[0] : input.sort;
    const params = buildListQuery({
      ...input,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
      sort,
    });

    return apiClient.get<Contracts.ListTaxFilingsOutput>(`/tax/filings?${params.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listPayments(
    input: Contracts.TaxPaymentsListQuery
  ): Promise<Contracts.TaxPaymentsListResponse> {
    const sort = Array.isArray(input.sort) ? input.sort[0] : input.sort;
    const params = buildListQuery({
      ...input,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
      sort,
    });

    return apiClient.get<Contracts.TaxPaymentsListResponse>(`/tax/payments?${params.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async exportPayments(
    input: Contracts.ExportTaxPaymentsInput
  ): Promise<Contracts.ExportTaxPaymentsResponse> {
    const params = buildListQuery(input);

    return apiClient.get<Contracts.ExportTaxPaymentsResponse>(
      `/tax/payments/export?${params.toString()}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getVatFilingPeriods(
    input: Contracts.GetVatPeriodsInput
  ): Promise<Contracts.GetVatPeriodsOutput> {
    const params = buildListQuery({ year: input.year, entityId: input.entityId });

    return apiClient.get<Contracts.GetVatPeriodsOutput>(`/tax/vat/periods?${params.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createFiling(
    input: Contracts.CreateTaxFilingInput
  ): Promise<Contracts.CreateTaxFilingOutput> {
    return apiClient.post<Contracts.CreateTaxFilingOutput>("/tax/filings", input, {
      correlationId: apiClient.generateCorrelationId(),
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  }

  async getFilingDetail(id: string): Promise<Contracts.TaxFilingDetailResponse> {
    return apiClient.get<Contracts.TaxFilingDetailResponse>(`/tax/filings/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listFilingItems(
    id: string,
    query: Contracts.TaxFilingItemsListQuery
  ): Promise<Contracts.TaxFilingItemsListResponse> {
    const sort = Array.isArray(query.sort) ? query.sort[0] : query.sort;
    const params = buildListQuery({
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      sort,
    });

    return apiClient.get<Contracts.TaxFilingItemsListResponse>(
      `/tax/filings/${id}/items?${params.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async listFilingAttachments(id: string): Promise<Contracts.TaxFilingAttachmentsResponse> {
    return apiClient.get<Contracts.TaxFilingAttachmentsResponse>(`/tax/filings/${id}/attachments`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async attachFilingDocument(
    id: string,
    request: Contracts.AttachTaxFilingDocumentRequest
  ): Promise<Contracts.AttachTaxFilingDocumentResponse> {
    return apiClient.post<Contracts.AttachTaxFilingDocumentResponse>(
      `/tax/filings/${id}/attachments`,
      request,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async removeFilingAttachment(id: string, attachmentId: string): Promise<{ removed: boolean }> {
    return apiClient.delete<{ removed: boolean }>(
      `/tax/filings/${id}/attachments/${attachmentId}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async listFilingActivity(id: string): Promise<Contracts.TaxFilingActivityResponse> {
    return apiClient.get<Contracts.TaxFilingActivityResponse>(`/tax/filings/${id}/activity`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async recalculateFiling(id: string): Promise<Contracts.RecalculateTaxFilingResponse> {
    return apiClient.post<Contracts.RecalculateTaxFilingResponse>(
      `/tax/filings/${id}/recalculate`,
      {},
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async submitFiling(
    id: string,
    request: Contracts.SubmitTaxFilingRequest
  ): Promise<Contracts.SubmitTaxFilingResponse> {
    return apiClient.post<Contracts.SubmitTaxFilingResponse>(`/tax/filings/${id}/submit`, request, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async markFilingPaid(
    id: string,
    request: Contracts.MarkTaxFilingPaidRequest
  ): Promise<Contracts.MarkTaxFilingPaidResponse> {
    return apiClient.post<Contracts.MarkTaxFilingPaidResponse>(
      `/tax/filings/${id}/mark-paid`,
      request,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async attachPaymentProof(
    id: string,
    request: Contracts.AttachTaxFilingPaymentProofRequest
  ): Promise<Contracts.AttachTaxFilingPaymentProofResponse> {
    return apiClient.post<Contracts.AttachTaxFilingPaymentProofResponse>(
      `/tax/filings/${id}/payment-proof`,
      request,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async deleteFiling(id: string): Promise<{ deleted: boolean }> {
    return apiClient.delete<{ deleted: boolean }>(`/tax/filings/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getConsultant(): Promise<Contracts.GetTaxConsultantOutput> {
    return apiClient.get<Contracts.GetTaxConsultantOutput>("/tax/consultant", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertConsultant(
    input: Contracts.UpsertTaxConsultantInput
  ): Promise<Contracts.UpsertTaxConsultantOutput> {
    return apiClient.put<Contracts.UpsertTaxConsultantOutput>("/tax/consultant", input, {
      correlationId: apiClient.generateCorrelationId(),
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  }
}

export const taxApi = new TaxApi();
