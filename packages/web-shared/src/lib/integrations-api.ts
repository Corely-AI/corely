import type {
  CreateIntegrationConnectionInput,
  IntegrationConnectionDto,
  ListIntegrationConnectionsOutput,
  TestIntegrationConnectionOutput,
  UpdateIntegrationConnectionInput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

export const integrationsApi = {
  async listConnections(params?: {
    workspaceId?: string;
    kind?:
      | "sumup"
      | "adyen"
      | "stripe_terminal"
      | "microsoft_graph_mail"
      | "google_gmail"
      | "resend";
  }): Promise<IntegrationConnectionDto[]> {
    const query = new URLSearchParams();
    if (params?.workspaceId) {
      query.set("workspaceId", params.workspaceId);
    }
    if (params?.kind) {
      query.set("kind", params.kind);
    }

    const suffix = query.toString();
    const path = suffix ? `/integrations/connections?${suffix}` : "/integrations/connections";
    const response = await apiClient.get<ListIntegrationConnectionsOutput>(path);
    return response.items;
  },

  async createConnection(
    input: CreateIntegrationConnectionInput
  ): Promise<IntegrationConnectionDto> {
    const response = await apiClient.post<{ connection: IntegrationConnectionDto }>(
      "/integrations/connections",
      input
    );
    return response.connection;
  },

  async updateConnection(
    id: string,
    patch: Omit<UpdateIntegrationConnectionInput, "id">
  ): Promise<IntegrationConnectionDto> {
    const response = await apiClient.patch<{ connection: IntegrationConnectionDto }>(
      `/integrations/connections/${id}`,
      patch
    );
    return response.connection;
  },

  async testConnection(id: string): Promise<TestIntegrationConnectionOutput> {
    return apiClient.post<TestIntegrationConnectionOutput>(
      `/integrations/connections/${id}/test`,
      {}
    );
  },
};
