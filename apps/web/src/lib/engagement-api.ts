import type {
  ConsumeCustomerPackageInput,
  ConsumeCustomerPackageOutput,
  CreateCustomerPackageInput,
  CreateCustomerPackageOutput,
  CreateLoyaltyAdjustEntryInput,
  CreateLoyaltyAdjustEntryOutput,
  CreateLoyaltyRedeemEntryInput,
  CreateLoyaltyRedeemEntryOutput,
  GetLoyaltySummaryOutput,
  ListCustomerPackagesInput,
  ListCustomerPackagesOutput,
  ListLoyaltyLedgerOutput,
  ListPackageUsageOutput,
  ListUpcomingBirthdaysInput,
  ListUpcomingBirthdaysOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

export const engagementApi = {
  async getLoyaltySummary(customerPartyId: string): Promise<GetLoyaltySummaryOutput> {
    return apiClient.get<GetLoyaltySummaryOutput>(`/engagement/loyalty/${customerPartyId}`);
  },

  async listLoyaltyLedger(
    customerPartyId: string,
    params?: { cursor?: string; pageSize?: number }
  ): Promise<ListLoyaltyLedgerOutput> {
    const queryParams = new URLSearchParams();
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/engagement/loyalty/${customerPartyId}/ledger?${queryString}`
      : `/engagement/loyalty/${customerPartyId}/ledger`;
    return apiClient.get<ListLoyaltyLedgerOutput>(endpoint);
  },

  async adjustLoyaltyPoints(
    input: Omit<CreateLoyaltyAdjustEntryInput, "idempotencyKey">
  ): Promise<CreateLoyaltyAdjustEntryOutput> {
    return apiClient.post<CreateLoyaltyAdjustEntryOutput>("/engagement/loyalty/adjust", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  },

  async redeemLoyaltyPoints(
    input: Omit<CreateLoyaltyRedeemEntryInput, "idempotencyKey">
  ): Promise<CreateLoyaltyRedeemEntryOutput> {
    return apiClient.post<CreateLoyaltyRedeemEntryOutput>("/engagement/loyalty/redeem", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  },

  async createCustomerPackage(
    input: Omit<CreateCustomerPackageInput, "idempotencyKey">
  ): Promise<CreateCustomerPackageOutput> {
    return apiClient.post<CreateCustomerPackageOutput>("/engagement/packages", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
    });
  },

  async listCustomerPackages(
    params?: ListCustomerPackagesInput
  ): Promise<ListCustomerPackagesOutput> {
    const queryParams = new URLSearchParams();
    if (params?.customerPartyId) {
      queryParams.append("customerPartyId", params.customerPartyId);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.includeInactive !== undefined) {
      queryParams.append("includeInactive", params.includeInactive ? "true" : "false");
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/engagement/packages?${queryString}` : "/engagement/packages";
    return apiClient.get<ListCustomerPackagesOutput>(endpoint);
  },

  async consumeCustomerPackage(
    customerPackageId: string,
    input: Omit<ConsumeCustomerPackageInput, "customerPackageId" | "idempotencyKey">
  ): Promise<ConsumeCustomerPackageOutput> {
    return apiClient.post<ConsumeCustomerPackageOutput>(
      `/engagement/packages/${customerPackageId}/consume`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  },

  async listPackageUsage(
    customerPackageId: string,
    params?: { cursor?: string; pageSize?: number }
  ): Promise<ListPackageUsageOutput> {
    const queryParams = new URLSearchParams();
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/engagement/packages/${customerPackageId}/usage?${queryString}`
      : `/engagement/packages/${customerPackageId}/usage`;
    return apiClient.get<ListPackageUsageOutput>(endpoint);
  },

  async listUpcomingBirthdays(
    params?: ListUpcomingBirthdaysInput
  ): Promise<ListUpcomingBirthdaysOutput> {
    const queryParams = new URLSearchParams();
    if (params?.from) {
      queryParams.append("from", params.from);
    }
    if (params?.to) {
      queryParams.append("to", params.to);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/engagement/birthdays/upcoming?${queryString}`
      : "/engagement/birthdays/upcoming";
    return apiClient.get<ListUpcomingBirthdaysOutput>(endpoint);
  },
};
