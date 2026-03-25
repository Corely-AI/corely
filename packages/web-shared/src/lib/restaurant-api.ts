import type {
  GetRestaurantFloorPlanOutput,
  ListKitchenStationsOutput,
  ListKitchenTicketsInput,
  ListKitchenTicketsOutput,
  ListRestaurantModifierGroupsOutput,
  UpsertDiningRoomInput,
  UpsertDiningRoomOutput,
  UpsertKitchenStationInput,
  UpsertKitchenStationOutput,
  UpsertRestaurantModifierGroupInput,
  UpsertRestaurantModifierGroupOutput,
  UpsertRestaurantTableInput,
  UpsertRestaurantTableOutput,
  UpdateKitchenTicketStatusOutput,
  KitchenTicketStatus,
} from "@corely/contracts";
import { apiClient } from "./api-client";

const toQuery = (params?: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export class RestaurantApi {
  async getFloorPlan(roomId?: string): Promise<GetRestaurantFloorPlanOutput> {
    return apiClient.get(`/restaurant/floor-plan${toQuery({ roomId })}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertDiningRoom(input: UpsertDiningRoomInput): Promise<UpsertDiningRoomOutput> {
    return apiClient.post("/restaurant/dining-rooms", input, {
      idempotencyKey: input.idempotencyKey ?? apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertTable(input: UpsertRestaurantTableInput): Promise<UpsertRestaurantTableOutput> {
    return apiClient.post("/restaurant/tables", input, {
      idempotencyKey: input.idempotencyKey ?? apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listModifierGroups(): Promise<ListRestaurantModifierGroupsOutput> {
    return apiClient.get("/restaurant/modifier-groups", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertModifierGroup(
    input: UpsertRestaurantModifierGroupInput
  ): Promise<UpsertRestaurantModifierGroupOutput> {
    return apiClient.post("/restaurant/modifier-groups", input, {
      idempotencyKey: input.idempotencyKey ?? apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listKitchenStations(): Promise<ListKitchenStationsOutput> {
    return apiClient.get("/restaurant/kitchen-stations", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertKitchenStation(
    input: UpsertKitchenStationInput
  ): Promise<UpsertKitchenStationOutput> {
    return apiClient.post("/restaurant/kitchen-stations", input, {
      idempotencyKey: input.idempotencyKey ?? apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listKitchenTickets(params?: ListKitchenTicketsInput): Promise<ListKitchenTicketsOutput> {
    return apiClient.get(
      `/restaurant/kitchen/tickets${toQuery({
        page: params?.page,
        pageSize: params?.pageSize,
        stationId: params?.stationId,
        status: params?.status,
      })}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async updateKitchenTicketStatus(
    ticketId: string,
    status: KitchenTicketStatus
  ): Promise<UpdateKitchenTicketStatusOutput> {
    return apiClient.post(
      `/restaurant/kitchen/tickets/${ticketId}/status`,
      { status },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }
}

export const restaurantApi = new RestaurantApi();
