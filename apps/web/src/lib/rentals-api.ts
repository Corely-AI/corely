import type {
  RentalProperty,
  ListRentalPropertiesInput,
  CreateRentalPropertyInput,
  UpdateRentalPropertyInput,
  ListPublicRentalPropertiesInput,
  CheckAvailabilityInput,
  CheckAvailabilityOutput,
  RentalCategory,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import { resolveCmsApiBaseUrl, buildPublicFileUrl } from "./cms-api";
import { request } from "@corely/api-client";
import {
  resolvePublicWorkspacePathPrefix,
  resolvePublicWorkspaceSlug,
} from "@/shared/public-workspace";

const requestPublic = async <T>(
  endpoint: string,
  opts?: {
    method?: string;
    body?: unknown;
    token?: string;
    idempotencyKey?: string;
    correlationId?: string;
  }
): Promise<T> => {
  const pathPrefix = resolvePublicWorkspacePathPrefix();
  const prefixedEndpoint = pathPrefix ? `${pathPrefix}${endpoint}` : endpoint;
  const url = withPublicWorkspaceQuery(prefixedEndpoint);

  return request<T>({
    url: `${resolveCmsApiBaseUrl()}${url}`,
    method: opts?.method ?? "GET",
    body: opts?.body,
    accessToken: opts?.token,
    idempotencyKey: opts?.idempotencyKey,
    correlationId: opts?.correlationId,
  });
};

export class RentalsApi {
  async listProperties(params?: ListRentalPropertiesInput): Promise<RentalProperty[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.categoryId) {
      queryParams.append("categoryId", params.categoryId);
    }
    if (params?.q) {
      queryParams.append("q", params.q);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/rentals/properties?${queryString}` : "/rentals/properties";

    return apiClient.get<RentalProperty[]>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getProperty(id: string): Promise<RentalProperty> {
    return apiClient.get<RentalProperty>(`/rentals/properties/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createProperty(input: CreateRentalPropertyInput): Promise<RentalProperty> {
    return apiClient.post<RentalProperty>("/rentals/properties", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateProperty(id: string, input: UpdateRentalPropertyInput): Promise<RentalProperty> {
    return apiClient.put<RentalProperty>(`/rentals/properties/${id}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async publishProperty(id: string): Promise<RentalProperty> {
    return apiClient.post<RentalProperty>(
      `/rentals/properties/${id}/publish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async unpublishProperty(id: string): Promise<RentalProperty> {
    return apiClient.post<RentalProperty>(
      `/rentals/properties/${id}/unpublish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listPublicProperties(params?: ListPublicRentalPropertiesInput): Promise<RentalProperty[]> {
    const queryParams = new URLSearchParams();
    if (params?.q) {
      queryParams.append("q", params.q);
    }
    if (params?.categorySlug) {
      queryParams.append("categorySlug", params.categorySlug);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/public/rentals/properties?${queryString}`
      : "/public/rentals/properties";

    return requestPublic<RentalProperty[]>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getPublicProperty(slug: string): Promise<RentalProperty> {
    return requestPublic<RentalProperty>(`/public/rentals/properties/${slug}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async checkAvailability(params: CheckAvailabilityInput): Promise<CheckAvailabilityOutput> {
    const queryParams = new URLSearchParams();
    queryParams.append("from", params.from);
    queryParams.append("to", params.to);

    return requestPublic<CheckAvailabilityOutput>(
      `/public/rentals/properties/${params.propertySlug}/availability?${queryParams.toString()}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  // Categories (Admin)
  async listCategories(): Promise<RentalCategory[]> {
    return apiClient.get<RentalCategory[]>("/rentals/categories", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createCategory(input: { name: string; slug: string }): Promise<RentalCategory> {
    return apiClient.post<RentalCategory>("/rentals/categories", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateCategory(id: string, input: { name: string; slug: string }): Promise<RentalCategory> {
    return apiClient.put<RentalCategory>(`/rentals/categories/${id}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async deleteCategory(id: string): Promise<void> {
    return apiClient.delete(`/rentals/categories/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  // Categories (Public)
  async listPublicCategories(): Promise<RentalCategory[]> {
    return requestPublic<RentalCategory[]>("/public/rentals/categories", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const rentalsApi = new RentalsApi();
export { buildPublicFileUrl };

const allowPublicWorkspaceQuery = () =>
  import.meta.env.DEV || import.meta.env.VITE_PUBLIC_WORKSPACE_QUERY_ENABLED === "true";

const withPublicWorkspaceQuery = (endpoint: string): string => {
  const workspaceSlug = resolvePublicWorkspaceSlug();
  if (!workspaceSlug || !allowPublicWorkspaceQuery()) {
    return endpoint;
  }

  const url = new URL(endpoint, "http://localhost");
  if (!url.searchParams.has("w")) {
    url.searchParams.set("w", workspaceSlug);
  }
  return `${url.pathname}${url.search}`;
};
