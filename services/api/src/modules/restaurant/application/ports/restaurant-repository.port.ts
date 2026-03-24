import type {
  DiningRoom,
  FloorPlanRoom,
  KitchenStation,
  KitchenTicket,
  ListKitchenStationsInput,
  ListKitchenTicketsInput,
  ListRestaurantModifierGroupsInput,
  RestaurantApprovalRequest,
  RestaurantModifierGroup,
  RestaurantOrder,
  RestaurantTable,
  TableSession,
  UpsertDiningRoomInput,
  UpsertKitchenStationInput,
  UpsertRestaurantModifierGroupInput,
  UpsertRestaurantTableInput,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export type RestaurantOrderAggregateRecord = {
  session: TableSession;
  order: RestaurantOrder;
};

export const RESTAURANT_REPOSITORY = Symbol("RESTAURANT_REPOSITORY");

export interface RestaurantRepositoryPort {
  listFloorPlan(tenantId: string, workspaceId: string, roomId?: string): Promise<FloorPlanRoom[]>;
  upsertDiningRoom(
    tenantId: string,
    workspaceId: string,
    input: UpsertDiningRoomInput,
    tx?: TransactionContext
  ): Promise<DiningRoom>;
  upsertTable(
    tenantId: string,
    workspaceId: string,
    input: UpsertRestaurantTableInput,
    tx?: TransactionContext
  ): Promise<RestaurantTable>;
  listModifierGroups(
    tenantId: string,
    workspaceId: string,
    input: ListRestaurantModifierGroupsInput
  ): Promise<{ items: RestaurantModifierGroup[]; total: number }>;
  upsertModifierGroup(
    tenantId: string,
    workspaceId: string,
    input: UpsertRestaurantModifierGroupInput,
    tx?: TransactionContext
  ): Promise<RestaurantModifierGroup>;
  listKitchenStations(
    tenantId: string,
    workspaceId: string,
    input: ListKitchenStationsInput
  ): Promise<{ items: KitchenStation[]; total: number }>;
  upsertKitchenStation(
    tenantId: string,
    workspaceId: string,
    input: UpsertKitchenStationInput,
    tx?: TransactionContext
  ): Promise<KitchenStation>;
  findTableById(
    tenantId: string,
    workspaceId: string,
    tableId: string
  ): Promise<RestaurantTable | null>;
  findActiveOrderByTable(
    tenantId: string,
    workspaceId: string,
    tableId: string
  ): Promise<RestaurantOrderAggregateRecord | null>;
  findOrderById(
    tenantId: string,
    workspaceId: string,
    orderId: string
  ): Promise<RestaurantOrderAggregateRecord | null>;
  findOrderByOrderItemId(
    tenantId: string,
    workspaceId: string,
    orderItemId: string
  ): Promise<RestaurantOrderAggregateRecord | null>;
  createOpenTable(
    tenantId: string,
    workspaceId: string,
    payload: {
      session: TableSession;
      order: RestaurantOrder;
    },
    tx?: TransactionContext
  ): Promise<RestaurantOrderAggregateRecord>;
  saveAggregate(
    tenantId: string,
    workspaceId: string,
    aggregate: RestaurantOrderAggregateRecord,
    tx?: TransactionContext
  ): Promise<RestaurantOrderAggregateRecord>;
  createKitchenTicketsForSend(
    tenantId: string,
    workspaceId: string,
    aggregate: RestaurantOrderAggregateRecord,
    sendKey: string,
    tx?: TransactionContext
  ): Promise<KitchenTicket[]>;
  listKitchenTickets(
    tenantId: string,
    workspaceId: string,
    input: ListKitchenTicketsInput
  ): Promise<{ items: KitchenTicket[]; total: number }>;
  updateKitchenTicketStatus(
    tenantId: string,
    workspaceId: string,
    ticketId: string,
    status: KitchenTicket["status"],
    tx?: TransactionContext
  ): Promise<KitchenTicket | null>;
  findKitchenTicketById(
    tenantId: string,
    workspaceId: string,
    ticketId: string
  ): Promise<KitchenTicket | null>;
  createApprovalRequest(
    tenantId: string,
    workspaceId: string,
    payload: Omit<RestaurantApprovalRequest, "id" | "createdAt" | "updatedAt">,
    tx?: TransactionContext
  ): Promise<RestaurantApprovalRequest>;
  updateApprovalRequest(
    tenantId: string,
    workspaceId: string,
    approvalRequestId: string,
    patch: Partial<
      Pick<
        RestaurantApprovalRequest,
        "status" | "workflowInstanceId" | "decidedAt" | "decidedByUserId"
      >
    >,
    tx?: TransactionContext
  ): Promise<RestaurantApprovalRequest | null>;
  findApprovalRequestById(
    tenantId: string,
    workspaceId: string,
    approvalRequestId: string
  ): Promise<RestaurantApprovalRequest | null>;
  listApprovalRequests(
    tenantId: string,
    workspaceId: string,
    input?: {
      statuses?: RestaurantApprovalRequest["status"][];
      limit?: number;
    }
  ): Promise<RestaurantApprovalRequest[]>;
}
