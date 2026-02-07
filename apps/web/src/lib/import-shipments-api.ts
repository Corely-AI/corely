import type {
  CreateShipmentInput,
  CreateShipmentOutput,
  UpdateShipmentInput,
  UpdateShipmentOutput,
  ListShipmentsInput,
  ListShipmentsOutput,
  GetShipmentOutput,
  SubmitShipmentInput,
  SubmitShipmentOutput,
  ReceiveShipmentInput,
  ReceiveShipmentOutput,
  ImportShipmentDto,
} from "@corely/contracts";
import { apiClient } from "./api-client";

/**
 * API client for import shipment operations
 */
export class ImportShipmentsApi {
  async createShipment(input: CreateShipmentInput): Promise<ImportShipmentDto> {
    const result = await apiClient.post<CreateShipmentOutput>("/import/shipments", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.shipment;
  }

  async updateShipment(
    shipmentId: string,
    input: Omit<UpdateShipmentInput, "shipmentId">
  ): Promise<ImportShipmentDto> {
    const result = await apiClient.put<UpdateShipmentOutput>(
      `/import/shipments/${shipmentId}`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.shipment;
  }

  async listShipments(params?: ListShipmentsInput): Promise<ListShipmentsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.supplierPartyId) {
      queryParams.append("supplierPartyId", params.supplierPartyId);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.shippingMode) {
      queryParams.append("shippingMode", params.shippingMode);
    }
    if (params?.estimatedArrivalAfter) {
      queryParams.append("estimatedArrivalAfter", params.estimatedArrivalAfter);
    }
    if (params?.estimatedArrivalBefore) {
      queryParams.append("estimatedArrivalBefore", params.estimatedArrivalBefore);
    }
    if (params?.actualArrivalAfter) {
      queryParams.append("actualArrivalAfter", params.actualArrivalAfter);
    }
    if (params?.actualArrivalBefore) {
      queryParams.append("actualArrivalBefore", params.actualArrivalBefore);
    }
    if (params?.containerNumber) {
      queryParams.append("containerNumber", params.containerNumber);
    }
    if (params?.billOfLadingNumber) {
      queryParams.append("billOfLadingNumber", params.billOfLadingNumber);
    }
    if (params?.limit !== undefined) {
      queryParams.append("limit", params.limit.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append("offset", params.offset.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/import/shipments?${queryString}` : "/import/shipments";
    return apiClient.get<ListShipmentsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getShipment(shipmentId: string): Promise<ImportShipmentDto> {
    const result = await apiClient.get<GetShipmentOutput>(`/import/shipments/${shipmentId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.shipment;
  }

  async submitShipment(shipmentId: string): Promise<ImportShipmentDto> {
    const result = await apiClient.post<SubmitShipmentOutput>(
      `/import/shipments/${shipmentId}/submit`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.shipment;
  }

  async receiveShipment(
    shipmentId: string,
    input: Omit<ReceiveShipmentInput, "shipmentId">
  ): Promise<ReceiveShipmentOutput> {
    return apiClient.post<ReceiveShipmentOutput>(`/import/shipments/${shipmentId}/receive`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const importShipmentsApi = new ImportShipmentsApi();
