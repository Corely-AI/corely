import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { getPrismaClient } from "@corely/data";
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
import type {
  RestaurantOrderAggregateRecord,
  RestaurantRepositoryPort,
} from "../application/ports/restaurant-repository.port";
import {
  kitchenTicketInclude,
  mapAggregate,
  mapApprovalRequest,
  mapDiningRoom,
  mapKitchenStation,
  mapKitchenTicket,
  mapTable,
  orderAggregateInclude,
} from "./prisma-restaurant.repository.mappers";
import {
  listFloorPlanRecord,
  listModifierGroupsRecord,
} from "./prisma-restaurant.repository.reads";
import {
  createKitchenTicketsForSendRecord,
  saveAggregateRecord,
  upsertModifierGroupRecord,
} from "./prisma-restaurant.repository.writes";

@Injectable()
export class PrismaRestaurantRepository implements RestaurantRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listFloorPlan(
    tenantId: string,
    workspaceId: string,
    roomId?: string
  ): Promise<FloorPlanRoom[]> {
    return listFloorPlanRecord(this.prisma, tenantId, workspaceId, roomId);
  }

  async upsertDiningRoom(
    tenantId: string,
    workspaceId: string,
    input: UpsertDiningRoomInput,
    tx?: TransactionContext
  ): Promise<DiningRoom> {
    const client = getPrismaClient(this.prisma, tx);
    const room = input.id
      ? await client.diningRoom.update({
          where: { id: input.id },
          data: { name: input.name, sortOrder: input.sortOrder },
        })
      : await client.diningRoom.create({
          data: {
            tenantId,
            workspaceId,
            name: input.name,
            sortOrder: input.sortOrder,
          },
        });
    return mapDiningRoom(room);
  }

  async upsertTable(
    tenantId: string,
    workspaceId: string,
    input: UpsertRestaurantTableInput,
    tx?: TransactionContext
  ): Promise<RestaurantTable> {
    const client = getPrismaClient(this.prisma, tx);
    const table = input.id
      ? await client.restaurantTable.update({
          where: { id: input.id },
          data: {
            diningRoomId: input.diningRoomId,
            name: input.name,
            capacity: input.capacity ?? null,
            posX: input.posX ?? null,
            posY: input.posY ?? null,
            shape: input.shape,
            availabilityStatus: input.availabilityStatus,
          },
        })
      : await client.restaurantTable.create({
          data: {
            tenantId,
            workspaceId,
            diningRoomId: input.diningRoomId,
            name: input.name,
            capacity: input.capacity ?? null,
            posX: input.posX ?? null,
            posY: input.posY ?? null,
            shape: input.shape,
            availabilityStatus: input.availabilityStatus,
          },
        });
    return mapTable(table);
  }

  async listModifierGroups(
    tenantId: string,
    workspaceId: string,
    input: ListRestaurantModifierGroupsInput
  ): Promise<{ items: RestaurantModifierGroup[]; total: number }> {
    return listModifierGroupsRecord(this.prisma, tenantId, workspaceId, input);
  }

  async upsertModifierGroup(
    tenantId: string,
    workspaceId: string,
    input: UpsertRestaurantModifierGroupInput,
    tx?: TransactionContext
  ): Promise<RestaurantModifierGroup> {
    return upsertModifierGroupRecord(this.prisma, tenantId, workspaceId, input, tx);
  }

  async listKitchenStations(
    tenantId: string,
    workspaceId: string,
    input: ListKitchenStationsInput
  ): Promise<{ items: KitchenStation[]; total: number }> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.kitchenStation.findMany({
        where: { tenantId, workspaceId },
        orderBy: [{ name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.kitchenStation.count({ where: { tenantId, workspaceId } }),
    ]);
    return { items: items.map(mapKitchenStation), total };
  }

  async upsertKitchenStation(
    tenantId: string,
    workspaceId: string,
    input: UpsertKitchenStationInput,
    tx?: TransactionContext
  ): Promise<KitchenStation> {
    const client = getPrismaClient(this.prisma, tx);
    const station = input.id
      ? await client.kitchenStation.update({
          where: { id: input.id },
          data: { name: input.name, code: input.code },
        })
      : await client.kitchenStation.create({
          data: { tenantId, workspaceId, name: input.name, code: input.code },
        });
    return mapKitchenStation(station);
  }

  async findTableById(
    tenantId: string,
    workspaceId: string,
    tableId: string
  ): Promise<RestaurantTable | null> {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { tenantId, workspaceId, id: tableId },
    });
    return table ? mapTable(table) : null;
  }

  async findActiveOrderByTable(
    tenantId: string,
    workspaceId: string,
    tableId: string
  ): Promise<RestaurantOrderAggregateRecord | null> {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: {
        tenantId,
        workspaceId,
        tableId,
        status: { in: ["DRAFT", "PARTIALLY_SENT", "SENT", "PAID"] },
      },
      include: orderAggregateInclude,
      orderBy: { createdAt: "desc" },
    });
    return order ? mapAggregate(order) : null;
  }

  async findOrderById(
    tenantId: string,
    workspaceId: string,
    orderId: string
  ): Promise<RestaurantOrderAggregateRecord | null> {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: { tenantId, workspaceId, id: orderId },
      include: orderAggregateInclude,
    });
    return order ? mapAggregate(order) : null;
  }

  async findOrderByOrderItemId(
    tenantId: string,
    workspaceId: string,
    orderItemId: string
  ): Promise<RestaurantOrderAggregateRecord | null> {
    const orderItem = await this.prisma.restaurantOrderItem.findFirst({
      where: { tenantId, workspaceId, id: orderItemId },
      select: { orderId: true },
    });
    if (!orderItem) {
      return null;
    }
    return this.findOrderById(tenantId, workspaceId, orderItem.orderId);
  }

  async createOpenTable(
    tenantId: string,
    workspaceId: string,
    payload: { session: TableSession; order: RestaurantOrder },
    tx?: TransactionContext
  ): Promise<RestaurantOrderAggregateRecord> {
    const client = getPrismaClient(this.prisma, tx);
    await client.restaurantTableSession.create({
      data: {
        id: payload.session.id,
        tenantId,
        workspaceId,
        tableId: payload.session.tableId,
        registerId: payload.session.registerId,
        shiftSessionId: payload.session.shiftSessionId,
        openedByUserId: payload.session.openedByUserId,
        openedAt: new Date(payload.session.openedAt),
        status: payload.session.status,
        transferCount: payload.session.transferCount,
        notes: null,
      },
    });
    await client.restaurantOrder.create({
      data: {
        id: payload.order.id,
        tenantId,
        workspaceId,
        tableSessionId: payload.order.tableSessionId,
        tableId: payload.order.tableId,
        status: payload.order.status,
        subtotalCents: payload.order.subtotalCents,
        discountCents: payload.order.discountCents,
        taxCents: payload.order.taxCents,
        totalCents: payload.order.totalCents,
      },
    });
    return {
      session: payload.session,
      order: payload.order,
    };
  }

  async saveAggregate(
    tenantId: string,
    workspaceId: string,
    aggregate: RestaurantOrderAggregateRecord,
    tx?: TransactionContext
  ): Promise<RestaurantOrderAggregateRecord> {
    return saveAggregateRecord(this.prisma, tenantId, workspaceId, aggregate, tx);
  }

  async createKitchenTicketsForSend(
    tenantId: string,
    workspaceId: string,
    aggregate: RestaurantOrderAggregateRecord,
    sendKey: string,
    tx?: TransactionContext
  ): Promise<KitchenTicket[]> {
    return createKitchenTicketsForSendRecord(
      this.prisma,
      tenantId,
      workspaceId,
      aggregate,
      sendKey,
      tx
    );
  }

  async listKitchenTickets(
    tenantId: string,
    workspaceId: string,
    input: ListKitchenTicketsInput
  ): Promise<{ items: KitchenTicket[]; total: number }> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const where = {
      tenantId,
      workspaceId,
      ...(input.stationId ? { stationId: input.stationId } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.kitchenTicket.findMany({
        where,
        include: kitchenTicketInclude,
        orderBy: [{ sentAt: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.kitchenTicket.count({ where }),
    ]);
    return { items: items.map(mapKitchenTicket), total };
  }

  async updateKitchenTicketStatus(
    tenantId: string,
    workspaceId: string,
    ticketId: string,
    status: KitchenTicket["status"],
    tx?: TransactionContext
  ): Promise<KitchenTicket | null> {
    const client = getPrismaClient(this.prisma, tx);
    const current = await client.kitchenTicket.findFirst({
      where: { tenantId, workspaceId, id: ticketId },
      include: kitchenTicketInclude,
    });
    if (!current) {
      return null;
    }
    const updated = await client.kitchenTicket.update({
      where: { id: ticketId },
      data: {
        status,
        bumpedAt: status === "BUMPED" ? new Date() : current.bumpedAt,
      },
      include: kitchenTicketInclude,
    });
    return mapKitchenTicket(updated);
  }

  async findKitchenTicketById(
    tenantId: string,
    workspaceId: string,
    ticketId: string
  ): Promise<KitchenTicket | null> {
    const ticket = await this.prisma.kitchenTicket.findFirst({
      where: { tenantId, workspaceId, id: ticketId },
      include: kitchenTicketInclude,
    });
    return ticket ? mapKitchenTicket(ticket) : null;
  }

  async createApprovalRequest(
    tenantId: string,
    workspaceId: string,
    payload: Omit<RestaurantApprovalRequest, "id" | "createdAt" | "updatedAt">,
    tx?: TransactionContext
  ): Promise<RestaurantApprovalRequest> {
    const client = getPrismaClient(this.prisma, tx);
    const created = await client.restaurantApprovalRequest.create({
      data: {
        tenantId,
        workspaceId,
        orderId: payload.orderId,
        orderItemId: payload.orderItemId,
        type: payload.type,
        status: payload.status,
        reason: payload.reason,
        amountCents: payload.amountCents,
        workflowInstanceId: payload.workflowInstanceId,
        requestedByUserId: payload.requestedByUserId,
        decidedByUserId: payload.decidedByUserId,
        decidedAt: payload.decidedAt ? new Date(payload.decidedAt) : null,
      },
    });
    return mapApprovalRequest(created);
  }

  async updateApprovalRequest(
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
  ): Promise<RestaurantApprovalRequest | null> {
    const client = getPrismaClient(this.prisma, tx);
    const existing = await client.restaurantApprovalRequest.findFirst({
      where: { tenantId, workspaceId, id: approvalRequestId },
    });
    if (!existing) {
      return null;
    }
    const updated = await client.restaurantApprovalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: patch.status,
        workflowInstanceId: patch.workflowInstanceId,
        decidedAt: patch.decidedAt ? new Date(patch.decidedAt) : undefined,
        decidedByUserId: patch.decidedByUserId,
      },
    });
    return mapApprovalRequest(updated);
  }

  async findApprovalRequestById(
    tenantId: string,
    workspaceId: string,
    approvalRequestId: string
  ): Promise<RestaurantApprovalRequest | null> {
    const request = await this.prisma.restaurantApprovalRequest.findFirst({
      where: { tenantId, workspaceId, id: approvalRequestId },
    });
    return request ? mapApprovalRequest(request) : null;
  }
}
