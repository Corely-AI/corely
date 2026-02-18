import type {
  CreateDealInput,
  UpdateDealInput,
  ListDealsOutput,
  DealDto,
  CreateActivityInput,
  UpdateActivityInput,
  ListActivitiesOutput,
  GetTimelineOutput,
  ActivityDto,
  TimelineItem,
  ChannelDefinition,
  CreateLeadInput,
  ConvertLeadInput,
  LeadDto,
  CreateLeadOutput,
  ConvertLeadOutput,
  SequenceDto,
  CreateSequenceInput,
  AccountDto,
  CreateAccountInput,
  CreateAccountOutput,
  UpdateAccountInput,
  ListAccountsResponse,
  AccountCustomAttributes,
  SetAccountCustomAttributesInput,
  GetDealAiInsightsOutput,
  GetDealAiRecommendationsOutput,
  DraftDealMessageInput,
  DraftDealMessageOutput,
  ActivityAiParseInput,
  ActivityAiParseOutput,
  ActivityAiExtractInput,
  ActivityAiExtractOutput,
  CommunicationAiSummarizeInput,
  CommunicationAiSummarizeOutput,
  GetCrmAiSettingsOutput,
  UpdateCrmAiSettingsInput,
  UpdateCrmAiSettingsOutput,
} from "@corely/contracts";
import type {
  CreateCommunicationDraftInput,
  LogCommunicationInput,
  LogMessageInput,
  LogMessageOutput,
  SendCommunicationInput,
  ListChannelsOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

const unwrapDealResponse = (response: unknown): DealDto => {
  if (response && typeof response === "object") {
    if ("deal" in response) {
      return (response as { deal: DealDto }).deal;
    }
    if ("data" in response) {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === "object") {
        if ("deal" in data) {
          return (data as { deal: DealDto }).deal;
        }
        if ("id" in data) {
          return data as DealDto;
        }
      }
    }
    if ("id" in response) {
      return response as DealDto;
    }
  }

  return response as DealDto;
};

const unwrapActivityResponse = (response: unknown): ActivityDto => {
  if (response && typeof response === "object") {
    if ("activity" in response) {
      return (response as { activity: ActivityDto }).activity;
    }
    if ("data" in response) {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === "object") {
        if ("activity" in data) {
          return (data as { activity: ActivityDto }).activity;
        }
        if ("id" in data) {
          return data as ActivityDto;
        }
      }
    }
    if ("id" in response) {
      return response as ActivityDto;
    }
  }

  return response as ActivityDto;
};

export const crmApi = {
  // ============================================================
  // Deal Operations
  // ============================================================
  async createDeal(input: CreateDealInput): Promise<DealDto> {
    const response = await apiClient.post<unknown>("/crm/deals", input);
    return unwrapDealResponse(response);
  },

  async updateDeal(id: string, patch: Partial<UpdateDealInput>): Promise<DealDto> {
    const response = await apiClient.patch<unknown>(`/crm/deals/${id}`, patch);
    return unwrapDealResponse(response);
  },

  async moveDealStage(id: string, newStageId: string): Promise<DealDto> {
    const response = await apiClient.post<unknown>(`/crm/deals/${id}/move-stage`, {
      newStageId,
    });
    return unwrapDealResponse(response);
  },

  async markDealWon(id: string, wonAt?: string): Promise<DealDto> {
    const response = await apiClient.post<unknown>(`/crm/deals/${id}/mark-won`, {
      wonAt,
    });
    return unwrapDealResponse(response);
  },

  async markDealLost(id: string, lostReason?: string, lostAt?: string): Promise<DealDto> {
    const response = await apiClient.post<unknown>(`/crm/deals/${id}/mark-lost`, {
      lostReason,
      lostAt,
    });
    return unwrapDealResponse(response);
  },

  async getDeal(id: string): Promise<DealDto> {
    const response = await apiClient.get<unknown>(`/crm/deals/${id}`);
    return unwrapDealResponse(response);
  },

  async listDeals(params?: {
    partyId?: string;
    stageId?: string;
    status?: string;
    ownerUserId?: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<{ deals: DealDto[]; nextCursor?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.partyId) {
      queryParams.append("partyId", params.partyId);
    }
    if (params?.stageId) {
      queryParams.append("stageId", params.stageId);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.ownerUserId) {
      queryParams.append("ownerUserId", params.ownerUserId);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/crm/deals?${queryString}` : "/crm/deals";

    const response = await apiClient.get<ListDealsOutput>(endpoint);
    return { deals: response.items, nextCursor: response.nextCursor ?? undefined };
  },

  // ============================================================
  // Activity Operations
  // ============================================================
  async createActivity(
    input: CreateActivityInput,
    options?: { idempotencyKey?: string }
  ): Promise<ActivityDto> {
    const response = await apiClient.post<unknown>("/crm/activities", input, {
      idempotencyKey: options?.idempotencyKey,
    });
    return unwrapActivityResponse(response);
  },

  async updateActivity(id: string, patch: Partial<UpdateActivityInput>): Promise<ActivityDto> {
    const response = await apiClient.patch<unknown>(`/crm/activities/${id}`, patch);
    return unwrapActivityResponse(response);
  },

  async completeActivity(id: string, completedAt?: string): Promise<ActivityDto> {
    const response = await apiClient.post<unknown>(`/crm/activities/${id}/complete`, {
      completedAt,
    });
    return unwrapActivityResponse(response);
  },

  async listActivities(params?: {
    partyId?: string;
    dealId?: string;
    type?: string;
    status?: string;
    channelKey?: string;
    direction?: string;
    communicationStatus?: string;
    activityDateFrom?: string;
    activityDateTo?: string;
    assignedToUserId?: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<{ activities: ActivityDto[]; nextCursor?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.partyId) {
      queryParams.append("partyId", params.partyId);
    }
    if (params?.dealId) {
      queryParams.append("dealId", params.dealId);
    }
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.channelKey) {
      queryParams.append("channelKey", params.channelKey);
    }
    if (params?.direction) {
      queryParams.append("direction", params.direction);
    }
    if (params?.communicationStatus) {
      queryParams.append("communicationStatus", params.communicationStatus);
    }
    if (params?.activityDateFrom) {
      queryParams.append("activityDateFrom", params.activityDateFrom);
    }
    if (params?.activityDateTo) {
      queryParams.append("activityDateTo", params.activityDateTo);
    }
    if (params?.assignedToUserId) {
      queryParams.append("assignedToUserId", params.assignedToUserId);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/crm/activities?${queryString}` : "/crm/activities";

    const response = await apiClient.get<ListActivitiesOutput>(endpoint);
    return { activities: response.items, nextCursor: response.nextCursor ?? undefined };
  },

  // ============================================================
  // Timeline Operations
  // ============================================================
  async getTimeline(
    entityType: "party" | "deal",
    entityId: string,
    params?: {
      cursor?: string;
      pageSize?: number;
    }
  ): Promise<{ items: TimelineItem[]; nextCursor?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/crm/timeline/${entityType}/${entityId}?${queryString}`
      : `/crm/timeline/${entityType}/${entityId}`;

    const response = await apiClient.get<GetTimelineOutput>(endpoint);
    return { items: response.items, nextCursor: response.nextCursor };
  },

  // ============================================================
  // Channel Operations
  // ============================================================
  async listChannels(): Promise<ChannelDefinition[]> {
    const response = await apiClient.get<ListChannelsOutput>("/crm/channels");
    return response.channels;
  },

  async logMessage(input: LogMessageInput): Promise<ActivityDto> {
    const response = await apiClient.post<LogMessageOutput>(
      `/crm/deals/${input.dealId}/messages`,
      input
    );
    return response.activity;
  },

  async createCommunicationDraft(
    input: CreateCommunicationDraftInput,
    options?: { idempotencyKey?: string }
  ): Promise<ActivityDto> {
    const response = await apiClient.post<{ activity: ActivityDto }>(
      "/crm/communications/draft",
      input,
      { idempotencyKey: options?.idempotencyKey }
    );
    return response.activity;
  },

  async sendCommunication(id: string, providerKey?: string): Promise<ActivityDto> {
    const payload: Partial<SendCommunicationInput> = {};
    if (providerKey) {
      payload.providerKey = providerKey;
    }
    const response = await apiClient.post<{ activity: ActivityDto }>(
      `/crm/communications/${id}/send`,
      payload
    );
    return response.activity;
  },

  async logCommunication(
    input: LogCommunicationInput,
    options?: { idempotencyKey?: string }
  ): Promise<ActivityDto> {
    const response = await apiClient.post<{ activity: ActivityDto }>(
      "/crm/communications/log",
      input,
      { idempotencyKey: options?.idempotencyKey }
    );
    return response.activity;
  },

  async getDealAiInsights(
    dealId: string,
    params?: { refresh?: boolean }
  ): Promise<GetDealAiInsightsOutput> {
    const query = params?.refresh ? "?refresh=true" : "";
    return apiClient.get<GetDealAiInsightsOutput>(`/crm/deals/${dealId}/ai/insights${query}`);
  },

  async getDealAiRecommendations(
    dealId: string,
    params?: { refresh?: boolean }
  ): Promise<GetDealAiRecommendationsOutput> {
    const query = params?.refresh ? "?refresh=true" : "";
    return apiClient.get<GetDealAiRecommendationsOutput>(
      `/crm/deals/${dealId}/ai/recommendations${query}`
    );
  },

  async draftDealAiMessage(
    dealId: string,
    input: DraftDealMessageInput
  ): Promise<DraftDealMessageOutput> {
    return apiClient.post<DraftDealMessageOutput>(`/crm/deals/${dealId}/ai/draft-message`, input);
  },

  async parseActivityAi(input: ActivityAiParseInput): Promise<ActivityAiParseOutput> {
    return apiClient.post<ActivityAiParseOutput>("/crm/activities/ai/parse", input);
  },

  async extractActivityAi(input: ActivityAiExtractInput): Promise<ActivityAiExtractOutput> {
    return apiClient.post<ActivityAiExtractOutput>("/crm/activities/ai/extract", input);
  },

  async summarizeCommunicationAi(
    input: CommunicationAiSummarizeInput
  ): Promise<CommunicationAiSummarizeOutput> {
    return apiClient.post<CommunicationAiSummarizeOutput>("/crm/comms/ai/summarize", input);
  },

  async getCrmAiSettings(): Promise<GetCrmAiSettingsOutput> {
    return apiClient.get<GetCrmAiSettingsOutput>("/crm/ai/settings");
  },

  async updateCrmAiSettings(input: UpdateCrmAiSettingsInput): Promise<UpdateCrmAiSettingsOutput> {
    return apiClient.patch<UpdateCrmAiSettingsOutput>("/crm/ai/settings", input);
  },

  // ============================================================
  // Lead Operations
  // ============================================================
  async createLead(input: CreateLeadInput): Promise<LeadDto> {
    const response = await apiClient.post<CreateLeadOutput>("/crm/leads", input);
    return response.lead;
  },

  async listLeads(params?: { status?: string }): Promise<LeadDto[]> {
    const response = await apiClient.get<{ items: LeadDto[]; nextCursor?: string | null }>(
      params?.status ? `/crm/leads?status=${params.status}` : "/crm/leads"
    );
    return response.items;
  },

  async getLead(id: string): Promise<LeadDto> {
    return await apiClient.get<LeadDto>(`/crm/leads/${id}`);
  },

  async convertLead(input: ConvertLeadInput): Promise<ConvertLeadOutput> {
    return await apiClient.post<ConvertLeadOutput>(`/crm/leads/${input.leadId}/convert`, input);
  },

  // ============================================================
  // Sequence Operations
  // ============================================================
  async listSequences(): Promise<SequenceDto[]> {
    return await apiClient.get<SequenceDto[]>("/crm/sequences");
  },

  async createSequence(input: CreateSequenceInput): Promise<SequenceDto> {
    return await apiClient.post<SequenceDto>("/crm/sequences", input);
  },

  async enrollEntity(input: {
    sequenceId: string;
    entityType: "lead" | "party";
    entityId: string;
  }): Promise<{ enrollmentId: string }> {
    return await apiClient.post<{ enrollmentId: string }>("/crm/sequences/enroll", input);
  },

  // ============================================================
  // Account Operations
  // ============================================================
  async createAccount(input: CreateAccountInput): Promise<AccountDto> {
    const response = await apiClient.post<CreateAccountOutput>("/crm/accounts", input);
    return response.account;
  },

  async updateAccount(id: string, patch: Partial<UpdateAccountInput>): Promise<AccountDto> {
    const response = await apiClient.patch<{ account: AccountDto }>(`/crm/accounts/${id}`, patch);
    return response.account;
  },

  async setAccountCustomAttributes(
    id: string,
    input: SetAccountCustomAttributesInput
  ): Promise<void> {
    await apiClient.put(`/crm/accounts/${id}/custom-attributes`, input);
  },

  async getAccountCustomAttributes(id: string): Promise<AccountCustomAttributes> {
    return await apiClient.get<AccountCustomAttributes>(`/crm/accounts/${id}/custom-attributes`);
  },

  async getAccount(id: string): Promise<AccountDto> {
    const response = await apiClient.get<{ account: AccountDto }>(`/crm/accounts/${id}`);
    return response.account;
  },

  async listAccounts(params?: {
    q?: string;
    status?: string;
    accountType?: string;
    ownerUserId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ListAccountsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.q) {
      queryParams.append("q", params.q);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.accountType) {
      queryParams.append("accountType", params.accountType);
    }
    if (params?.ownerUserId) {
      queryParams.append("ownerUserId", params.ownerUserId);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const qs = queryParams.toString();
    return await apiClient.get<ListAccountsResponse>(qs ? `/crm/accounts?${qs}` : "/crm/accounts");
  },
};
