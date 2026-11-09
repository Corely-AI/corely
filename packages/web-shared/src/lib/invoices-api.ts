/**
 * Invoices API Client
 * Handles HTTP calls to invoice endpoints
 */

import type {
  CreateInvoiceInput,
  CreateInvoiceOutput,
  DraftInvoiceIssueEmailInput,
  DraftInvoiceIssueEmailOutput,
  DraftInvoiceReminderEmailInput,
  DraftInvoiceReminderEmailOutput,
  RequestInvoicePdfOutput,
  InvoiceDto,
  InvoiceCapabilities,
  RecordPaymentInput,
  UpdateInvoiceInput,
  ListInvoicesInput,
  ListInvoicesOutput,
  GenerateInvoiceShareLinkInput,
  GenerateInvoiceShareLinkOutput,
  GetInvoiceShareLinkOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import type { FeatureHttpClient } from "../session/feature-http-client";
import { buildListQuery } from "./api-query-utils";

export type InvoicePdfResponse = RequestInvoicePdfOutput & {
  retryAfterMs?: number;
};

export class InvoicesApi {
  constructor(private readonly http: FeatureHttpClient = apiClient) {}

  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput, idempotencyKey?: string): Promise<InvoiceDto> {
    const result = await this.http.post<CreateInvoiceOutput>("/invoices", input, {
      idempotencyKey: idempotencyKey || this.http.generateIdempotencyKey(),
      correlationId: this.http.generateCorrelationId(),
    });
    return result.invoice;
  }

  /**
   * Get all invoices
   */
  async listInvoices(params?: ListInvoicesInput): Promise<ListInvoicesOutput> {
    const searchParams = buildListQuery(params);

    const result = await this.http.get<unknown>(`/invoices?${searchParams.toString()}`, {
      correlationId: this.http.generateCorrelationId(),
    });

    // Normalize response
    if (Array.isArray(result)) {
      return { items: result as InvoiceDto[] };
    }

    if (
      typeof result === "object" &&
      result !== null &&
      "items" in result &&
      Array.isArray((result as { items: unknown }).items)
    ) {
      return result as ListInvoicesOutput;
    }

    // Fallback/Legacy
    if (
      typeof result === "object" &&
      result !== null &&
      "invoices" in result &&
      Array.isArray((result as { invoices: unknown }).invoices)
    ) {
      return { items: (result as { invoices: InvoiceDto[] }).invoices };
    }

    return { items: [] };
  }

  /**
   * Get invoice by ID with capabilities
   */
  async getInvoice(
    id: string
  ): Promise<{ invoice: InvoiceDto; capabilities?: InvoiceCapabilities }> {
    const result = await this.http.get<{ invoice: InvoiceDto; capabilities?: InvoiceCapabilities }>(
      `/invoices/${id}`,
      {
        correlationId: this.http.generateCorrelationId(),
      }
    );
    if (result && typeof result === "object" && "invoice" in result) {
      return { invoice: result.invoice, capabilities: result.capabilities };
    }
    // Fallback for older API responses without capabilities
    return { invoice: result as unknown as InvoiceDto };
  }

  /**
   * Update invoice
   */
  async updateInvoice(
    id: string,
    input: Omit<UpdateInvoiceInput, "invoiceId">
  ): Promise<InvoiceDto> {
    const result = await this.http.patch<{ invoice: InvoiceDto }>(`/invoices/${id}`, input, {
      correlationId: this.http.generateCorrelationId(),
    });
    return result.invoice;
  }

  /**
   * Finalize invoice (change from DRAFT to ISSUED)
   */
  async finalizeInvoice(id: string, paymentMethodId?: string): Promise<InvoiceDto> {
    const result = await this.http.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/finalize`,
      paymentMethodId ? { paymentMethodId } : {},
      {
        idempotencyKey: this.http.generateIdempotencyKey(),
        correlationId: this.http.generateCorrelationId(),
      }
    );
    return result.invoice;
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(
    id: string,
    payload?: {
      to?: string;
      subject?: string;
      message?: string;
      cc?: string[];
      bcc?: string[];
      attachPdf?: boolean;
      idempotencyKey?: string;
    }
  ): Promise<InvoiceDto> {
    const requestIdempotencyKey = payload?.idempotencyKey ?? this.http.generateIdempotencyKey();
    const requestPayload = {
      ...(payload || {}),
      idempotencyKey: requestIdempotencyKey,
    };
    const result = await this.http.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/send`,
      requestPayload,
      {
        idempotencyKey: requestIdempotencyKey,
        correlationId: this.http.generateCorrelationId(),
      }
    );
    return result.invoice;
  }

  /**
   * Draft first-send invoice email (copilot, draft-only)
   */
  async draftIssueEmail(
    id: string,
    input: Omit<DraftInvoiceIssueEmailInput, "invoiceId">
  ): Promise<DraftInvoiceIssueEmailOutput> {
    return this.http.post<DraftInvoiceIssueEmailOutput>(
      `/invoices/${id}/copilot/draft-issue-email`,
      input,
      {
        correlationId: this.http.generateCorrelationId(),
      }
    );
  }

  /**
   * Draft payment reminder email (copilot, draft-only)
   */
  async draftReminderEmail(
    id: string,
    input: Omit<DraftInvoiceReminderEmailInput, "invoiceId">
  ): Promise<DraftInvoiceReminderEmailOutput> {
    return this.http.post<DraftInvoiceReminderEmailOutput>(
      `/invoices/${id}/copilot/draft-reminder`,
      input,
      {
        correlationId: this.http.generateCorrelationId(),
      }
    );
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(id: string, reason?: string): Promise<InvoiceDto> {
    const result = await this.http.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/cancel`,
      { reason },
      {
        idempotencyKey: this.http.generateIdempotencyKey(),
        correlationId: this.http.generateCorrelationId(),
      }
    );
    return result.invoice;
  }

  /**
   * Download invoice PDF
   * Optionally waits for the worker to finish rendering.
   */
  async downloadInvoicePdf(
    id: string,
    options?: { waitMs?: number; signal?: AbortSignal; forceRegenerate?: boolean }
  ): Promise<InvoicePdfResponse> {
    const params = new URLSearchParams();
    if (typeof options?.waitMs === "number") {
      params.set("waitMs", String(Math.floor(options.waitMs)));
    }
    if (options?.forceRegenerate) {
      params.set("forceRegenerate", "true");
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";

    return this.http.request<InvoicePdfResponse>(
      `/invoices/${id}/pdf${query}`,
      { method: "GET", signal: options?.signal },
      {
        correlationId: this.http.generateCorrelationId(),
      }
    );
  }

  /**
   * Record a payment for an invoice
   */
  async recordPayment(input: RecordPaymentInput): Promise<InvoiceDto> {
    const result = await this.http.post<{ invoice: InvoiceDto }>(
      `/invoices/${input.invoiceId}/payments`,
      { amountCents: input.amountCents, paidAt: input.paidAt, note: input.note },
      {
        idempotencyKey: this.http.generateIdempotencyKey(),
        correlationId: this.http.generateCorrelationId(),
      }
    );
    return result.invoice;
  }

  /**
   * Generate or regenerate anonymous share link for invoice PDF viewing
   */
  async generateShareLink(
    id: string,
    input?: GenerateInvoiceShareLinkInput
  ): Promise<GenerateInvoiceShareLinkOutput> {
    return this.http.post<GenerateInvoiceShareLinkOutput>(
      `/invoices/${id}/share-link`,
      input ?? {
        regenerate: false,
      }
    );
  }

  /**
   * Get existing anonymous share link (if generated before)
   */
  async getShareLink(id: string): Promise<GetInvoiceShareLinkOutput> {
    return this.http.get<GetInvoiceShareLinkOutput>(`/invoices/${id}/share-link`);
  }
}

export const invoicesApi = new InvoicesApi();
