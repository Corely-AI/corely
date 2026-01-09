import { apiClient } from "./api-client";
import type {
  CreateCustomerInput,
  CreateCustomerOutput,
  UpdateCustomerInput,
  UpdateCustomerOutput,
  CustomerDto,
} from "@corely/contracts";

export const customersApi = {
  async createCustomer(input: CreateCustomerInput): Promise<CustomerDto> {
    const response = await apiClient.post<CreateCustomerOutput>("/customers", input);
    // Support both wrapped `{ customer }` responses and raw DTO bodies
    if (typeof response === "object" && response !== null && "customer" in response) {
      return (response as CreateCustomerOutput).customer;
    }
    return response as CustomerDto;
  },

  async updateCustomer(id: string, patch: UpdateCustomerInput["patch"]): Promise<CustomerDto> {
    const response = await apiClient.patch<UpdateCustomerOutput>(`/customers/${id}`, patch);
    return response.customer;
  },

  async getCustomer(id: string): Promise<CustomerDto | null> {
    const response = await apiClient.get<unknown>(`/customers/${id}`);
    if (!response) {
      return null;
    }
    if (typeof response === "object" && response !== null) {
      if ("customer" in response) {
        const customer = (response as { customer?: CustomerDto | null }).customer;
        return customer ?? null;
      }
      if ("data" in response) {
        const customer = (response as { data?: CustomerDto | null }).data;
        return customer ?? null;
      }
    }
    return response as CustomerDto;
  },

  async listCustomers(params?: {
    cursor?: string;
    pageSize?: number;
    includeArchived?: boolean;
  }): Promise<{ customers: CustomerDto[]; nextCursor?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    if (params?.includeArchived !== undefined) {
      queryParams.append("includeArchived", params.includeArchived.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/customers?${queryString}` : "/customers";

    const response = await apiClient.get<unknown>(endpoint);
    if (Array.isArray(response)) {
      return { customers: response as CustomerDto[] };
    }

    if (
      typeof response === "object" &&
      response !== null &&
      "items" in response &&
      Array.isArray((response as { items: unknown }).items)
    ) {
      const { items, nextCursor } = response as { items: CustomerDto[]; nextCursor?: string };
      return { customers: items, nextCursor };
    }

    return response as { customers: CustomerDto[]; nextCursor?: string };
  },

  async archiveCustomer(id: string): Promise<CustomerDto> {
    const response = await apiClient.post<{ customer: CustomerDto }>(`/customers/${id}/archive`);
    return response.customer;
  },

  async unarchiveCustomer(id: string): Promise<CustomerDto> {
    const response = await apiClient.post<{ customer: CustomerDto }>(`/customers/${id}/unarchive`);
    return response.customer;
  },
};
