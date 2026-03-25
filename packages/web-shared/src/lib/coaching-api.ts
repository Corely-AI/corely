import type {
  ArchiveCoachingOfferOutput,
  CoachingOfferDto,
  CreateCoachingOfferInput,
  CreateCoachingOfferOutput,
  CoachingEngagementDetailDto,
  GenerateCoachingExportBundleOutput,
  GetCoachingOfferOutput,
  ListCoachingOffersInput,
  ListCoachingOffersOutput,
  ListCoachingEngagementsInput,
  ListCoachingEngagementsOutput,
  ListCoachingSessionsInput,
  ListCoachingSessionsOutput,
  CreateCoachingCheckoutSessionOutput,
  UpdateCoachingOfferInput,
  UpdateCoachingOfferOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import { buildListQuery } from "./api-query-utils";

const withQuery = (basePath: string, params?: Record<string, unknown>) => {
  const query = buildListQuery(params);
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

class CoachingApi {
  async listOffers(params: ListCoachingOffersInput = {}): Promise<ListCoachingOffersOutput> {
    return apiClient.get<ListCoachingOffersOutput>(withQuery("/coaching-offers", params), {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getOffer(id: string): Promise<CoachingOfferDto> {
    const result = await apiClient.get<GetCoachingOfferOutput>(`/coaching-offers/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.offer;
  }

  async createOffer(input: CreateCoachingOfferInput): Promise<CreateCoachingOfferOutput> {
    return apiClient.post<CreateCoachingOfferOutput>("/coaching-offers", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateOffer(
    id: string,
    patch: UpdateCoachingOfferInput
  ): Promise<UpdateCoachingOfferOutput> {
    return apiClient.patch<UpdateCoachingOfferOutput>(`/coaching-offers/${id}`, patch, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async archiveOffer(id: string): Promise<ArchiveCoachingOfferOutput> {
    return apiClient.post<ArchiveCoachingOfferOutput>(
      `/coaching-offers/${id}/archive`,
      {},
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

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
