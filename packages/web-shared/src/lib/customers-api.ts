import { apiClient } from "./api-client";
import type {
  CreateCustomerInput,
  CreateCustomerOutput,
  UpdateCustomerInput,
  UpdateCustomerOutput,
  CustomerDto,
  LinkGuardianInput,
  LinkGuardianOutput,
  SetPrimaryPayerInput,
  SetPrimaryPayerOutput,
  ListStudentGuardiansOutput,
  PartyRoleType,
  SearchCustomersOutput,
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

  async updateCustomer(
    id: string,
    patch: UpdateCustomerInput["patch"],
    role?: PartyRoleType
  ): Promise<CustomerDto> {
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    const response = await apiClient.patch<UpdateCustomerOutput>(`/customers/${id}${query}`, patch);
    return response.customer;
  },

  async getCustomer(id: string, role?: PartyRoleType): Promise<CustomerDto | null> {
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    const response = await apiClient.get<unknown>(`/customers/${id}${query}`);
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
    role?: PartyRoleType;
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
    if (params?.role) {
      queryParams.append("role", params.role);
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

  async searchCustomers(params?: {
    q?: string;
    cursor?: string;
    pageSize?: number;
    role?: PartyRoleType;
  }): Promise<{ customers: CustomerDto[]; nextCursor?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.q) {
      queryParams.append("q", params.q);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    if (params?.role) {
      queryParams.append("role", params.role);
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/customers/search?${queryString}` : "/customers/search";
    const response = await apiClient.get<SearchCustomersOutput>(endpoint);
    return {
      customers: response.items,
      nextCursor: response.nextCursor ?? undefined,
    };
  },

  async archiveCustomer(id: string, role?: PartyRoleType): Promise<CustomerDto> {
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    const response = await apiClient.post<{ customer: CustomerDto }>(
      `/customers/${id}/archive${query}`
    );
    return response.customer;
  },

  async unarchiveCustomer(id: string, role?: PartyRoleType): Promise<CustomerDto> {
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    const response = await apiClient.post<{ customer: CustomerDto }>(
      `/customers/${id}/unarchive${query}`
    );
    return response.customer;
  },

  async listStudentGuardians(studentId: string): Promise<ListStudentGuardiansOutput> {
    return apiClient.get<ListStudentGuardiansOutput>(`/customers/${studentId}/guardians`);
  },

  async linkGuardian(studentId: string, input: LinkGuardianInput): Promise<LinkGuardianOutput> {
    return apiClient.post<LinkGuardianOutput>(`/customers/${studentId}/guardians`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  },

  async unlinkGuardian(studentId: string, guardianClientId: string): Promise<LinkGuardianOutput> {
    return apiClient.delete<LinkGuardianOutput>(
      `/customers/${studentId}/guardians/${guardianClientId}`
    );
  },

  async setPrimaryPayer(
    studentId: string,
    input: SetPrimaryPayerInput
  ): Promise<SetPrimaryPayerOutput> {
    return apiClient.post<SetPrimaryPayerOutput>(`/customers/${studentId}/primary-payer`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  },
};
