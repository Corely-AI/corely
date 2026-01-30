/**
 * Tax API Client
 * Wrapper around tax endpoints for managing tax profiles, codes, calculations, and VAT reporting
 */

import type {
  GetTaxProfileOutput,
  UpsertTaxProfileInput,
  UpsertTaxProfileOutput,
  ListTaxCodesOutput,
  CreateTaxCodeInput,
  CreateTaxCodeOutput,
  UpdateTaxCodeInput,
  UpdateTaxCodeOutput,
  ListTaxRatesOutput,
  CreateTaxRateInput,
  CreateTaxRateOutput,
  CalculateTaxInput,
  CalculateTaxOutput,
  LockTaxSnapshotInput,
  LockTaxSnapshotOutput,
  GetTaxSummaryOutput,
  ListTaxReportsOutput,
  ListVatPeriodsOutput,
  GetVatPeriodSummaryOutput,
  GetVatPeriodDetailsOutput,
  GetTaxConsultantOutput,
  UpsertTaxConsultantInput,
  UpsertTaxConsultantOutput,
  MarkTaxReportSubmittedOutput,
  MarkVatPeriodSubmittedInput,
  MarkVatPeriodSubmittedOutput,
  MarkVatPeriodNilInput,
  MarkVatPeriodNilOutput,
  ArchiveVatPeriodInput,
  ArchiveVatPeriodOutput,
  TaxProfileDto,
  TaxCodeDto,
  TaxRateDto,
  TaxBreakdownDto,
  TaxSnapshotDto,
  TaxReportDto,
  GetTaxCenterInput,
  GetTaxCenterOutput,
  ListTaxFilingsInput,
  ListTaxFilingsOutput,
  GetVatPeriodsInput,
  GetVatPeriodsOutput,
  CreateTaxFilingInput,
  CreateTaxFilingOutput,
  TaxFilingDetailResponse,
  TaxFilingItemsListQuery,
  TaxFilingItemsListResponse,
  TaxFilingAttachmentsResponse,
  AttachTaxFilingDocumentRequest,
  AttachTaxFilingDocumentResponse,
  TaxFilingActivityResponse,
  SubmitTaxFilingRequest,
  SubmitTaxFilingResponse,
  MarkTaxFilingPaidRequest,
  MarkTaxFilingPaidResponse,
  RecalculateTaxFilingResponse,
} from "@corely/contracts";
import { apiClient } from "./api-client";

export class TaxApi {
  // ============================================================================
  // Tax Profile
  // ============================================================================

  /**
   * Get active tax profile for tenant
   */
  async getProfile(): Promise<TaxProfileDto | null> {
    const result = await apiClient.get<GetTaxProfileOutput>("/tax/profile", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.profile;
  }

  /**
   * Create or update tax profile
   */
  async upsertProfile(
    input: UpsertTaxProfileInput,
    idempotencyKey?: string
  ): Promise<TaxProfileDto> {
    const result = await apiClient.put<UpsertTaxProfileOutput>("/tax/profile", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.profile;
  }

  // ============================================================================
  // Tax Codes
  // ============================================================================

  /**
   * List all tax codes for tenant
   */
  async listTaxCodes(): Promise<TaxCodeDto[]> {
    const result = await apiClient.get<ListTaxCodesOutput>("/tax/codes", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.codes;
  }

  /**
   * Create new tax code
   */
  async createTaxCode(input: CreateTaxCodeInput, idempotencyKey?: string): Promise<TaxCodeDto> {
    const result = await apiClient.post<CreateTaxCodeOutput>("/tax/codes", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.code;
  }

  /**
   * Update tax code
   */
  async updateTaxCode(
    id: string,
    input: UpdateTaxCodeInput,
    idempotencyKey?: string
  ): Promise<TaxCodeDto> {
    const result = await apiClient.patch<UpdateTaxCodeOutput>(`/tax/codes/${id}`, input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.code;
  }

  // ============================================================================
  // Tax Rates
  // ============================================================================

  /**
   * List rates for a tax code
   */
  async listTaxRates(taxCodeId: string): Promise<TaxRateDto[]> {
    const result = await apiClient.get<ListTaxRatesOutput>(`/tax/rates?taxCodeId=${taxCodeId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.rates;
  }

  /**
   * Create new tax rate
   */
  async createTaxRate(input: CreateTaxRateInput, idempotencyKey?: string): Promise<TaxRateDto> {
    const result = await apiClient.post<CreateTaxRateOutput>("/tax/rates", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.rate;
  }

  // ============================================================================
  // Tax Calculation
  // ============================================================================

  /**
   * Calculate tax for draft preview (invoice/expense)
   */
  async calculateTax(input: CalculateTaxInput): Promise<TaxBreakdownDto> {
    const result = await apiClient.post<CalculateTaxOutput>("/tax/calculate", input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.breakdown;
  }

  /**
   * Lock immutable tax snapshot for finalized document
   */
  async lockSnapshot(
    input: LockTaxSnapshotInput,
    idempotencyKey?: string
  ): Promise<TaxSnapshotDto> {
    const result = await apiClient.post<LockTaxSnapshotOutput>("/tax/snapshots/lock", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.snapshot;
  }

  // ============================================================================
  // Summary & Reports
  // ============================================================================

  async getSummary() {
    return apiClient.get<GetTaxSummaryOutput>("/tax/summary", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listReports(status: "upcoming" | "submitted" = "upcoming") {
    return apiClient.get<ListTaxReportsOutput>(`/tax/reports?status=${status}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getReport(id: string): Promise<TaxReportDto> {
    const result = await apiClient.get<{ report: TaxReportDto }>(`/tax/reports/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.report;
  }

  async markReportSubmitted(id: string) {
    return apiClient.post<MarkTaxReportSubmittedOutput>(
      `/tax/reports/${id}/mark-submitted`,
      {},
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  // ============================================================================
  // VAT Periods
  // ============================================================================

  async listVatPeriods(from?: string, to?: string) {
    let url = "/tax/periods";
    const params = new URLSearchParams();
    if (from) {
      params.append("from", from);
    }
    if (to) {
      params.append("to", to);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return apiClient.get<ListVatPeriodsOutput>(url, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listVatPeriodsByYear(year: number, type: "VAT_QUARTERLY" = "VAT_QUARTERLY") {
    const params = new URLSearchParams();
    params.append("year", String(year));
    params.append("type", type);
    return apiClient.get<ListVatPeriodsOutput>(`/tax/periods?${params.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getVatPeriodSummary(key: string) {
    return apiClient.get<GetVatPeriodSummaryOutput>(`/tax/periods/${key}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getVatPeriodDetails(key: string) {
    return apiClient.get<GetVatPeriodDetailsOutput>(`/tax/periods/${key}/details`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async markVatPeriodSubmitted(key: string, input: MarkVatPeriodSubmittedInput) {
    return apiClient.post<MarkVatPeriodSubmittedOutput>(
      `/tax/reports/vat/quarterly/${key}/mark-submitted`,
      input,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async markVatPeriodNil(key: string, input: MarkVatPeriodNilInput) {
    return apiClient.post<MarkVatPeriodNilOutput>(
      `/tax/reports/vat/quarterly/${key}/mark-nil`,
      input,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async archiveVatPeriod(key: string, input: ArchiveVatPeriodInput) {
    return apiClient.post<ArchiveVatPeriodOutput>(
      `/tax/reports/vat/quarterly/${key}/archive`,
      input,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async getVatPeriodPdfUrl(key: string) {
    return apiClient.get<{ downloadUrl: string }>(`/tax/reports/vat/quarterly/${key}/pdf-url`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getReportPdfUrl(id: string) {
    return apiClient.get<{ downloadUrl: string }>(`/tax/reports/${id}/pdf-url`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  // ============================================================================
  // Tax Center & Filings (New)
  // ============================================================================

  async getCenter(input: GetTaxCenterInput) {
    const params = new URLSearchParams();
    if (input.year) {
      params.append("year", String(input.year));
    }
    if (input.entityId) {
      params.append("entityId", input.entityId);
    }

    return apiClient.get<GetTaxCenterOutput>(`/tax/center?${params.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listFilings(input: ListTaxFilingsInput) {
    const params = new URLSearchParams();
    if (input.q) {
      params.append("q", input.q);
    }
    params.append("page", String(input.page || 1));
    params.append("pageSize", String(input.pageSize || 20));
    const sort = Array.isArray(input.sort) ? input.sort[0] : input.sort;
    if (sort) {
      params.append("sort", sort);
    }
    if (input.filters && input.filters.length > 0) {
      params.append("filters", JSON.stringify(input.filters));
    }
    if (input.type) {
      params.append("type", input.type);
    }
    if (input.status) {
      params.append("status", input.status);
    }
    if (input.year) {
      params.append("year", String(input.year));
    }
    if (input.periodKey) {
      params.append("periodKey", input.periodKey);
    }
    if (input.dueFrom) {
      params.append("dueFrom", input.dueFrom);
    }
    if (input.dueTo) {
      params.append("dueTo", input.dueTo);
    }
    if (input.needsAttention !== undefined) {
      params.append("needsAttention", String(input.needsAttention));
    }
    if (input.hasIssues !== undefined) {
      params.append("hasIssues", String(input.hasIssues));
    }
    if (input.entityId) {
      params.append("entityId", input.entityId);
    }

    return apiClient.get<ListTaxFilingsOutput>(`/tax/filings?${params.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getVatFilingPeriods(input: GetVatPeriodsInput) {
    const params = new URLSearchParams();
    params.append("year", String(input.year));
    if (input.entityId) {
      params.append("entityId", input.entityId);
    }

    return apiClient.get<GetVatPeriodsOutput>(`/tax/vat/periods?${params.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createFiling(input: CreateTaxFilingInput) {
    return apiClient.post<CreateTaxFilingOutput>("/tax/filings", input, {
      correlationId: apiClient.generateCorrelationId(),
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  }

  async getFilingDetail(id: string) {
    return apiClient.get<TaxFilingDetailResponse>(`/tax/filings/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listFilingItems(id: string, query: TaxFilingItemsListQuery) {
    const params = new URLSearchParams();
    if (query.q) {
      params.append("q", query.q);
    }
    params.append("page", String(query.page || 1));
    params.append("pageSize", String(query.pageSize || 20));
    if (query.sort) {
      params.append("sort", Array.isArray(query.sort) ? query.sort[0] : query.sort);
    }
    if (query.filters && query.filters.length > 0) {
      params.append("filters", JSON.stringify(query.filters));
    }
    if (query.sourceType) {
      params.append("sourceType", query.sourceType);
    }
    if (query.dateFrom) {
      params.append("dateFrom", query.dateFrom);
    }
    if (query.dateTo) {
      params.append("dateTo", query.dateTo);
    }
    if (query.category) {
      params.append("category", query.category);
    }
    if (query.needsAttention !== undefined) {
      params.append("needsAttention", String(query.needsAttention));
    }
    if (query.missingMapping !== undefined) {
      params.append("missingMapping", String(query.missingMapping));
    }

    return apiClient.get<TaxFilingItemsListResponse>(
      `/tax/filings/${id}/items?${params.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async listFilingAttachments(id: string) {
    return apiClient.get<TaxFilingAttachmentsResponse>(`/tax/filings/${id}/attachments`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async attachFilingDocument(id: string, request: AttachTaxFilingDocumentRequest) {
    return apiClient.post<AttachTaxFilingDocumentResponse>(
      `/tax/filings/${id}/attachments`,
      request,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async removeFilingAttachment(id: string, attachmentId: string) {
    return apiClient.delete<{ removed: boolean }>(
      `/tax/filings/${id}/attachments/${attachmentId}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async listFilingActivity(id: string) {
    return apiClient.get<TaxFilingActivityResponse>(`/tax/filings/${id}/activity`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async recalculateFiling(id: string) {
    return apiClient.post<RecalculateTaxFilingResponse>(
      `/tax/filings/${id}/recalculate`,
      {},
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async submitFiling(id: string, request: SubmitTaxFilingRequest) {
    return apiClient.post<SubmitTaxFilingResponse>(`/tax/filings/${id}/submit`, request, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async markFilingPaid(id: string, request: MarkTaxFilingPaidRequest) {
    return apiClient.post<MarkTaxFilingPaidResponse>(`/tax/filings/${id}/mark-paid`, request, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async deleteFiling(id: string) {
    return apiClient.delete<{ deleted: boolean }>(`/tax/filings/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  // ============================================================================
  // React Query Hooks
  // ============================================================================

  // Note: We usually keep hooks separate but for speed adding helper here or just rely on API
  // Best practice: hooks in hooks/

  // ============================================================================
  // Consultant
  // ============================================================================

  async getConsultant() {
    return apiClient.get<GetTaxConsultantOutput>("/tax/consultant", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertConsultant(input: UpsertTaxConsultantInput) {
    return apiClient.put<UpsertTaxConsultantOutput>("/tax/consultant", input, {
      correlationId: apiClient.generateCorrelationId(),
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  }
}

export const taxApi = new TaxApi();
