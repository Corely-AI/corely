import type {
  CreateLotInput,
  CreateLotOutput,
  ListLotsInput,
  ListLotsOutput,
  GetLotOutput,
  GetExpirySummaryInput,
  GetExpirySummaryOutput,
  InventoryLotDto,
} from "@corely/contracts";
import { apiClient } from "./api-client";

/**
 * API client for inventory lot operations
 */
export class InventoryLotsApi {
  async createLot(input: CreateLotInput): Promise<InventoryLotDto> {
    const result = await apiClient.post<CreateLotOutput>("/inventory/lots", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.lot;
  }

  async listLots(params?: ListLotsInput): Promise<ListLotsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.productId) {
      queryParams.append("productId", params.productId);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.expiryBefore) {
      queryParams.append("expiryBefore", params.expiryBefore);
    }
    if (params?.expiryAfter) {
      queryParams.append("expiryAfter", params.expiryAfter);
    }
    if (params?.shipmentId) {
      queryParams.append("shipmentId", params.shipmentId);
    }
    if (params?.supplierPartyId) {
      queryParams.append("supplierPartyId", params.supplierPartyId);
    }
    if (params?.qtyOnHandGt !== undefined) {
      queryParams.append("qtyOnHandGt", params.qtyOnHandGt.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append("limit", params.limit.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append("offset", params.offset.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/inventory/lots?${queryString}` : "/inventory/lots";
    return apiClient.get<ListLotsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getLot(lotId: string): Promise<InventoryLotDto> {
    const result = await apiClient.get<GetLotOutput>(`/inventory/lots/${lotId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.lot;
  }

  async getExpirySummary(params?: GetExpirySummaryInput): Promise<GetExpirySummaryOutput> {
    const queryParams = new URLSearchParams();
    if (params?.days !== undefined) {
      queryParams.append("days", params.days.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/inventory/expiry/summary?${queryString}`
      : "/inventory/expiry/summary";
    return apiClient.get<GetExpirySummaryOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const inventoryLotsApi = new InventoryLotsApi();
