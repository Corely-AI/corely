import { ApiClient, type ApiClientConfig } from "@corely/auth-client";
import type {
  CloseRestaurantTableInput,
  CloseRestaurantTableOutput,
  CreateRegisterInput,
  CreateRegisterOutput,
  GetActiveRestaurantOrderOutput,
  GetRestaurantFloorPlanOutput,
  ListRegistersInput,
  ListRegistersOutput,
  ListRestaurantModifierGroupsOutput,
  OpenShiftInput,
  OpenShiftOutput,
  OpenRestaurantTableInput,
  OpenRestaurantTableOutput,
  RequestRestaurantDiscountInput,
  RequestRestaurantVoidInput,
  RestaurantApprovalMutationOutput,
  CloseShiftInput,
  CloseShiftOutput,
  PutRestaurantDraftOrderInput,
  PutRestaurantDraftOrderOutput,
  SendRestaurantOrderToKitchenInput,
  SendRestaurantOrderToKitchenOutput,
  TransferRestaurantTableInput,
  TransferRestaurantTableOutput,
  GetCurrentShiftInput,
  GetCurrentShiftOutput,
  SyncPosSaleInput,
  SyncPosSaleOutput,
  GetCatalogSnapshotInput,
  GetCatalogSnapshotOutput,
  StartCashlessPaymentInput,
  StartCashlessPaymentOutput,
  GetCashlessPaymentStatusOutput,
  SearchCustomersInput,
  SearchCustomersOutput,
  GetCustomerInput,
  CustomerDto,
  CreateCashEntry,
  CreateCheckInEventInput,
  CreateCheckInEventOutput,
  ListCheckInEventsInput,
  ListCheckInEventsOutput,
  GetLoyaltySummaryInput,
  GetLoyaltySummaryOutput,
  CreateLoyaltyEarnEntryInput,
  CreateLoyaltyEarnEntryOutput,
  ListLoyaltyLedgerInput,
  ListLoyaltyLedgerOutput,
  GetEngagementSettingsInput,
  GetEngagementSettingsOutput,
  UpdateEngagementSettingsInput,
  UpdateEngagementSettingsOutput,
} from "@corely/contracts";

/**
 * POS API Client
 * Extends shared ApiClient with POS-specific methods
 */
export class PosApiClient extends ApiClient {
  constructor(config: ApiClientConfig) {
    super(config);
  }
  // Register management
  async createRegister(input: CreateRegisterInput): Promise<CreateRegisterOutput> {
    return this.post<CreateRegisterOutput>("/pos/registers", input);
  }

  async listRegisters(input: ListRegistersInput): Promise<ListRegistersOutput> {
    const params = new URLSearchParams();
    if (input.status) {
      params.append("status", input.status);
    }
    const query = params.toString();

    return this.get<ListRegistersOutput>(`/pos/registers${query ? `?${query}` : ""}`);
  }

  // Shift management
  async openShift(input: OpenShiftInput): Promise<OpenShiftOutput> {
    return this.post<OpenShiftOutput>("/pos/shifts/open", input, {
      idempotencyKey: input.sessionId,
    });
  }

  async closeShift(input: CloseShiftInput): Promise<CloseShiftOutput> {
    return this.post<CloseShiftOutput>("/pos/shifts/close", input, {
      idempotencyKey: input.sessionId,
    });
  }

  async getCurrentShift(input: GetCurrentShiftInput): Promise<GetCurrentShiftOutput> {
    const params = new URLSearchParams({
      registerId: input.registerId,
    });

    return this.get<GetCurrentShiftOutput>(`/pos/shifts/current?${params.toString()}`);
  }

  // Sales sync
  async syncPosSale(input: SyncPosSaleInput): Promise<SyncPosSaleOutput> {
    return this.post<SyncPosSaleOutput>("/pos/sales/sync", input, {
      idempotencyKey: input.idempotencyKey,
    });
  }

  async startCashlessPayment(
    input: StartCashlessPaymentInput
  ): Promise<StartCashlessPaymentOutput> {
    return this.post<StartCashlessPaymentOutput>(
      "/pos/payments/cashless/start",
      input,
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );
  }

  async getCashlessPaymentStatus(attemptId: string): Promise<GetCashlessPaymentStatusOutput> {
    return this.get<GetCashlessPaymentStatusOutput>(`/pos/payments/cashless/${attemptId}`);
  }

  // Catalog
  async getCatalogSnapshot(input: GetCatalogSnapshotInput): Promise<GetCatalogSnapshotOutput> {
    const params = new URLSearchParams();
    if (input.warehouseId) {
      params.append("warehouseId", input.warehouseId);
    }
    if (input.limit) {
      params.append("limit", String(input.limit));
    }
    if (input.offset) {
      params.append("offset", String(input.offset));
    }
    if (input.updatedSince) {
      params.append("updatedSince", input.updatedSince.toISOString());
    }

    return this.get<GetCatalogSnapshotOutput>(
      `/pos/catalog/snapshot${params.toString() ? `?${params.toString()}` : ""}`
    );
  }

  // Customers
  async searchCustomers(input: SearchCustomersInput): Promise<SearchCustomersOutput> {
    const params = new URLSearchParams();
    if (input.q) {
      params.append("q", input.q);
    }
    if (input.role) {
      params.append("role", input.role);
    }
    if (input.cursor) {
      params.append("cursor", input.cursor);
    }
    if (input.pageSize) {
      params.append("pageSize", String(input.pageSize));
    }
    return this.get<SearchCustomersOutput>(`/customers/search?${params.toString()}`);
  }

  async getCustomer(input: GetCustomerInput): Promise<CustomerDto> {
    return this.get<CustomerDto>(`/customers/${input.id}`);
  }

  // Engagement
  async createCheckIn(
    input: CreateCheckInEventInput,
    idempotencyKey: string
  ): Promise<CreateCheckInEventOutput> {
    return this.post<CreateCheckInEventOutput>("/engagement/checkins", input, {
      idempotencyKey,
    });
  }

  async listCheckIns(input: ListCheckInEventsInput): Promise<ListCheckInEventsOutput> {
    const params = new URLSearchParams();
    if (input.customerPartyId) {
      params.append("customerPartyId", input.customerPartyId);
    }
    if (input.registerId) {
      params.append("registerId", input.registerId);
    }
    if (input.status) {
      params.append("status", input.status);
    }
    if (input.from) {
      params.append("from", input.from.toISOString());
    }
    if (input.to) {
      params.append("to", input.to.toISOString());
    }
    if (input.cursor) {
      params.append("cursor", input.cursor);
    }
    if (input.pageSize) {
      params.append("pageSize", String(input.pageSize));
    }
    return this.get<ListCheckInEventsOutput>(
      `/engagement/checkins${params.toString() ? `?${params.toString()}` : ""}`
    );
  }

  async getLoyaltySummary(input: GetLoyaltySummaryInput): Promise<GetLoyaltySummaryOutput> {
    return this.get<GetLoyaltySummaryOutput>(`/engagement/loyalty/${input.customerPartyId}`);
  }

  async listLoyaltyLedger(input: ListLoyaltyLedgerInput): Promise<ListLoyaltyLedgerOutput> {
    const params = new URLSearchParams();
    if (input.cursor) {
      params.append("cursor", input.cursor);
    }
    if (input.pageSize) {
      params.append("pageSize", String(input.pageSize));
    }
    return this.get<ListLoyaltyLedgerOutput>(
      `/engagement/loyalty/${input.customerPartyId}/ledger${
        params.toString() ? `?${params.toString()}` : ""
      }`
    );
  }

  async createLoyaltyEarn(
    input: CreateLoyaltyEarnEntryInput,
    idempotencyKey: string
  ): Promise<CreateLoyaltyEarnEntryOutput> {
    return this.post<CreateLoyaltyEarnEntryOutput>("/engagement/loyalty/earn", input, {
      idempotencyKey,
    });
  }

  async getEngagementSettings(
    _input: GetEngagementSettingsInput
  ): Promise<GetEngagementSettingsOutput> {
    return this.get<GetEngagementSettingsOutput>("/engagement/settings");
  }

  async updateEngagementSettings(
    input: UpdateEngagementSettingsInput
  ): Promise<UpdateEngagementSettingsOutput> {
    return this.patch<UpdateEngagementSettingsOutput>("/engagement/settings", input);
  }

  async createCashEntry(input: CreateCashEntry): Promise<{ entry: unknown }> {
    return this.post<{ entry: unknown }>(`/cash-registers/${input.registerId}/entries`, input, {
      idempotencyKey: this.generateIdempotencyKey(),
    });
  }

  async getRestaurantFloorPlan(): Promise<GetRestaurantFloorPlanOutput> {
    return this.get<GetRestaurantFloorPlanOutput>("/restaurant/floor-plan");
  }

  async listRestaurantModifierGroups(): Promise<ListRestaurantModifierGroupsOutput> {
    return this.get<ListRestaurantModifierGroupsOutput>("/restaurant/modifier-groups");
  }

  async openRestaurantTable(input: OpenRestaurantTableInput): Promise<OpenRestaurantTableOutput> {
    return this.post<OpenRestaurantTableOutput>("/restaurant/tables/open", input, {
      idempotencyKey: input.idempotencyKey,
    });
  }

  async getActiveRestaurantOrder(tableId: string): Promise<GetActiveRestaurantOrderOutput> {
    return this.get<GetActiveRestaurantOrderOutput>(`/restaurant/tables/${tableId}/current`);
  }

  async putRestaurantDraftOrder(
    input: PutRestaurantDraftOrderInput
  ): Promise<PutRestaurantDraftOrderOutput> {
    return this.put<PutRestaurantDraftOrderOutput>(
      `/restaurant/orders/${input.orderId}/draft`,
      input,
      {
        idempotencyKey: input.idempotencyKey,
      }
    );
  }

  async sendRestaurantOrderToKitchen(
    input: SendRestaurantOrderToKitchenInput
  ): Promise<SendRestaurantOrderToKitchenOutput> {
    return this.post<SendRestaurantOrderToKitchenOutput>(
      `/restaurant/orders/${input.orderId}/send`,
      input,
      {
        idempotencyKey: input.idempotencyKey,
      }
    );
  }

  async closeRestaurantTable(
    input: CloseRestaurantTableInput
  ): Promise<CloseRestaurantTableOutput> {
    return this.post<CloseRestaurantTableOutput>(
      `/restaurant/orders/${input.orderId}/close`,
      input,
      {
        idempotencyKey: input.idempotencyKey,
      }
    );
  }

  async transferRestaurantTable(
    input: TransferRestaurantTableInput
  ): Promise<TransferRestaurantTableOutput> {
    return this.post<TransferRestaurantTableOutput>(
      `/restaurant/orders/${input.orderId}/transfer`,
      input,
      {
        idempotencyKey: input.idempotencyKey,
      }
    );
  }

  async requestRestaurantVoid(
    input: RequestRestaurantVoidInput
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.post<RestaurantApprovalMutationOutput>("/restaurant/approvals/void", input, {
      idempotencyKey: input.idempotencyKey,
    });
  }

  async requestRestaurantDiscount(
    input: RequestRestaurantDiscountInput
  ): Promise<RestaurantApprovalMutationOutput> {
    return this.post<RestaurantApprovalMutationOutput>("/restaurant/approvals/discount", input, {
      idempotencyKey: input.idempotencyKey,
    });
  }
}
