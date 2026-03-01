import { apiClient } from "./api-client";
import type {
  CreateQuoteInput,
  CreateQuoteOutput,
  UpdateQuoteInput,
  UpdateQuoteOutput,
  SendQuoteOutput,
  AcceptQuoteOutput,
  RejectQuoteOutput,
  ConvertQuoteToOrderOutput,
  ConvertQuoteToInvoiceOutput,
  GetQuoteOutput,
  ListQuotesOutput,
  CreateSalesOrderInput,
  CreateSalesOrderOutput,
  UpdateSalesOrderInput,
  UpdateSalesOrderOutput,
  ConfirmSalesOrderOutput,
  FulfillSalesOrderOutput,
  CancelSalesOrderOutput,
  CreateInvoiceFromOrderOutput,
  GetSalesOrderOutput,
  ListSalesOrdersOutput,
  GetSalesSettingsOutput,
  UpdateSalesSettingsInput,
  UpdateSalesSettingsOutput,
} from "@corely/contracts";

export class SalesApi {
  async listQuotes(params?: {
    status?: string;
    customerPartyId?: string;
    fromDate?: string;
    toDate?: string;
    cursor?: string;
    pageSize?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.customerPartyId) {
      queryParams.append("customerPartyId", params.customerPartyId);
    }
    if (params?.fromDate) {
      queryParams.append("fromDate", params.fromDate);
    }
    if (params?.toDate) {
      queryParams.append("toDate", params.toDate);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/sales/quotes?${queryString}` : "/sales/quotes";
    return apiClient.get<ListQuotesOutput>(endpoint);
  }

  async getQuote(quoteId: string) {
    return apiClient.get<GetQuoteOutput>(`/sales/quotes/${quoteId}`);
  }

  async createQuote(input: CreateQuoteInput) {
    return apiClient.post<CreateQuoteOutput>("/sales/quotes", input, {
      idempotencyKey: input.idempotencyKey || apiClient.generateIdempotencyKey(),
    });
  }

  async updateQuote(quoteId: string, input: UpdateQuoteInput) {
    return apiClient.patch<UpdateQuoteOutput>(`/sales/quotes/${quoteId}`, input, {
      idempotencyKey: input.idempotencyKey,
    });
  }

  async sendQuote(quoteId: string) {
    return apiClient.post<SendQuoteOutput>(
      `/sales/quotes/${quoteId}/send`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async acceptQuote(quoteId: string) {
    return apiClient.post<AcceptQuoteOutput>(
      `/sales/quotes/${quoteId}/accept`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async rejectQuote(quoteId: string) {
    return apiClient.post<RejectQuoteOutput>(
      `/sales/quotes/${quoteId}/reject`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async convertQuoteToOrder(quoteId: string) {
    return apiClient.post<ConvertQuoteToOrderOutput>(
      `/sales/quotes/${quoteId}/convert-to-order`,
      {},
      { idempotencyKey: apiClient.generateIdempotencyKey() }
    );
  }

  async convertQuoteToInvoice(quoteId: string) {
    return apiClient.post<ConvertQuoteToInvoiceOutput>(
      `/sales/quotes/${quoteId}/convert-to-invoice`,
      {},
      { idempotencyKey: apiClient.generateIdempotencyKey() }
    );
  }

  async listOrders(params?: {
    status?: string;
    customerPartyId?: string;
    fromDate?: string;
    toDate?: string;
    cursor?: string;
    pageSize?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.customerPartyId) {
      queryParams.append("customerPartyId", params.customerPartyId);
    }
    if (params?.fromDate) {
      queryParams.append("fromDate", params.fromDate);
    }
    if (params?.toDate) {
      queryParams.append("toDate", params.toDate);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/sales/orders?${queryString}` : "/sales/orders";
    return apiClient.get<ListSalesOrdersOutput>(endpoint);
  }

  async getOrder(orderId: string) {
    return apiClient.get<GetSalesOrderOutput>(`/sales/orders/${orderId}`);
  }

  async createOrder(input: CreateSalesOrderInput) {
    return apiClient.post<CreateSalesOrderOutput>("/sales/orders", input, {
      idempotencyKey: input.idempotencyKey || apiClient.generateIdempotencyKey(),
    });
  }

  async updateOrder(orderId: string, input: UpdateSalesOrderInput) {
    return apiClient.patch<UpdateSalesOrderOutput>(`/sales/orders/${orderId}`, input, {
      idempotencyKey: input.idempotencyKey,
    });
  }

  async confirmOrder(orderId: string) {
    return apiClient.post<ConfirmSalesOrderOutput>(
      `/sales/orders/${orderId}/confirm`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async fulfillOrder(orderId: string) {
    return apiClient.post<FulfillSalesOrderOutput>(
      `/sales/orders/${orderId}/fulfill`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async cancelOrder(orderId: string) {
    return apiClient.post<CancelSalesOrderOutput>(
      `/sales/orders/${orderId}/cancel`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async createInvoiceFromOrder(orderId: string) {
    return apiClient.post<CreateInvoiceFromOrderOutput>(
      `/sales/orders/${orderId}/create-invoice`,
      {},
      { idempotencyKey: apiClient.generateIdempotencyKey() }
    );
  }

  async getSettings() {
    return apiClient.get<GetSalesSettingsOutput>("/sales/settings");
  }

  async updateSettings(input: UpdateSalesSettingsInput) {
    return apiClient.patch<UpdateSalesSettingsOutput>("/sales/settings", input, {
      idempotencyKey: input.idempotencyKey || apiClient.generateIdempotencyKey(),
    });
  }
}

export const salesApi = new SalesApi();
