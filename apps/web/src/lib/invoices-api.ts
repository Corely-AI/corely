/**
 * Invoices API Client
 * Handles HTTP calls to invoice endpoints
 */

import type {
  CreateInvoiceInput,
  CreateInvoiceOutput,
  InvoiceDto,
  InvoiceCapabilities,
  RecordPaymentInput,
  UpdateInvoiceInput,
  ListInvoicesInput,
  ListInvoicesOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import { buildListQuery } from "./api-query-utils";

export class InvoicesApi {
  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput, idempotencyKey?: string): Promise<InvoiceDto> {
    const result = await apiClient.post<CreateInvoiceOutput>("/invoices", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.invoice;
  }

  /**
   * Get all invoices
   */
  async listInvoices(params?: ListInvoicesInput): Promise<ListInvoicesOutput> {
    const searchParams = buildListQuery(params);

    const result = await apiClient.get<unknown>(`/invoices?${searchParams.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
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
    const result = await apiClient.get<{ invoice: InvoiceDto; capabilities?: InvoiceCapabilities }>(
      `/invoices/${id}`,
      {
        correlationId: apiClient.generateCorrelationId(),
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
    const result = await apiClient.patch<{ invoice: InvoiceDto }>(`/invoices/${id}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.invoice;
  }

  /**
   * Finalize invoice (change from DRAFT to ISSUED)
   */
  async finalizeInvoice(id: string, paymentMethodId?: string): Promise<InvoiceDto> {
    const result = await apiClient.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/finalize`,
      paymentMethodId ? { paymentMethodId } : {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
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
    }
  ): Promise<InvoiceDto> {
    const result = await apiClient.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/send`,
      payload || {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.invoice;
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(id: string, reason?: string): Promise<InvoiceDto> {
    const result = await apiClient.post<{ invoice: InvoiceDto }>(
      `/invoices/${id}/cancel`,
      { reason },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.invoice;
  }

  /**
   * Download invoice PDF
   * Returns a signed URL that expires after a short period
   */
  async downloadInvoicePdf(id: string) {
    return apiClient.get<{
      status: "PENDING" | "READY";
      downloadUrl?: string;
      expiresAt?: string;
    }>(`/invoices/${id}/pdf`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  /**
   * Record a payment for an invoice
   */
  async recordPayment(input: RecordPaymentInput): Promise<InvoiceDto> {
    const result = await apiClient.post<{ invoice: InvoiceDto }>(
      `/invoices/${input.invoiceId}/payments`,
      { amountCents: input.amountCents, paidAt: input.paidAt, note: input.note },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.invoice;
  }
}

export const invoicesApi = new InvoicesApi();
