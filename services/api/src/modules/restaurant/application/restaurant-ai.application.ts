import { Inject, Injectable } from "@nestjs/common";
import type {
  GetRestaurantFloorPlanOutput,
  ListKitchenTicketsOutput,
  RestaurantApprovalRequest,
  RestaurantOrder,
  TableSession,
} from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import { RestaurantApplication } from "./restaurant.application";
import {
  RESTAURANT_REPOSITORY,
  type RestaurantRepositoryPort,
} from "./ports/restaurant-repository.port";

@Injectable()
export class RestaurantAiApplication {
  constructor(
    private readonly restaurant: RestaurantApplication,
    @Inject(RESTAURANT_REPOSITORY)
    private readonly repo: RestaurantRepositoryPort
  ) {}

  async getFloorPlan(ctx: UseCaseContext): Promise<GetRestaurantFloorPlanOutput> {
    return this.restaurant.getFloorPlan({}, ctx);
  }

  async getActiveOrderByTable(
    tenantId: string,
    workspaceId: string,
    tableId: string
  ): Promise<{ session: TableSession; order: RestaurantOrder } | null> {
    return this.repo.findActiveOrderByTable(tenantId, workspaceId, tableId);
  }

  async getOrderById(
    tenantId: string,
    workspaceId: string,
    orderId: string
  ): Promise<{ session: TableSession; order: RestaurantOrder } | null> {
    return this.repo.findOrderById(tenantId, workspaceId, orderId);
  }

  async listKitchenTickets(
    ctx: UseCaseContext,
    input?: { status?: ListKitchenTicketsOutput["items"][number]["status"]; stationId?: string }
  ): Promise<ListKitchenTicketsOutput> {
    return this.restaurant.listKitchenTickets(
      {
        page: 1,
        pageSize: 50,
        status: input?.status,
        stationId: input?.stationId,
      },
      ctx
    );
  }

  async listApprovalRequests(
    tenantId: string,
    workspaceId: string,
    input?: { statuses?: RestaurantApprovalRequest["status"][]; limit?: number }
  ): Promise<RestaurantApprovalRequest[]> {
    return this.repo.listApprovalRequests(tenantId, workspaceId, input);
  }
}
