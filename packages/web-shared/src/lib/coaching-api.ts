import type {
  CoachingEngagementDetailDto,
  GenerateCoachingExportBundleOutput,
  ListCoachingEngagementsInput,
  ListCoachingEngagementsOutput,
  ListCoachingSessionsInput,
  ListCoachingSessionsOutput,
  CreateCoachingCheckoutSessionOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import { buildListQuery } from "./api-query-utils";

const withQuery = (basePath: string, params?: Record<string, unknown>) => {
  const query = buildListQuery(params);
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

class CoachingApi {
  async listEngagements(
    params: ListCoachingEngagementsInput
  ): Promise<ListCoachingEngagementsOutput> {
    return apiClient.get<ListCoachingEngagementsOutput>(
      withQuery("/coaching-engagements", params),
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async listSessions(params: ListCoachingSessionsInput): Promise<ListCoachingSessionsOutput> {
    return apiClient.get<ListCoachingSessionsOutput>(withQuery("/coaching-sessions", params), {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getEngagement(id: string): Promise<CoachingEngagementDetailDto> {
    return apiClient.get<CoachingEngagementDetailDto>(`/coaching-engagements/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createCheckoutSession(engagementId: string): Promise<CreateCoachingCheckoutSessionOutput> {
    return apiClient.post<CreateCoachingCheckoutSessionOutput>(
      `/coaching-engagements/${engagementId}/checkout`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async requestExportBundle(engagementId: string): Promise<GenerateCoachingExportBundleOutput> {
    return apiClient.post<GenerateCoachingExportBundleOutput>(
      `/coaching-engagements/${engagementId}/export`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }
}

export const coachingApi = new CoachingApi();
