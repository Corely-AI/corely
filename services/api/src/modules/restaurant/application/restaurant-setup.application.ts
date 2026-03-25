import { Injectable } from "@nestjs/common";
import type {
  GetRestaurantFloorPlanInput,
  GetRestaurantFloorPlanOutput,
  ListKitchenStationsInput,
  ListKitchenStationsOutput,
  ListKitchenTicketsInput,
  ListKitchenTicketsOutput,
  ListRestaurantModifierGroupsInput,
  ListRestaurantModifierGroupsOutput,
  UpdateKitchenTicketStatusInput,
  UpdateKitchenTicketStatusOutput,
  UpsertDiningRoomInput,
  UpsertDiningRoomOutput,
  UpsertKitchenStationInput,
  UpsertKitchenStationOutput,
  UpsertRestaurantModifierGroupInput,
  UpsertRestaurantModifierGroupOutput,
  UpsertRestaurantTableInput,
  UpsertRestaurantTableOutput,
} from "@corely/contracts";
import { NotFoundError, type UseCaseContext } from "@corely/kernel";
import {
  assertKitchenStatusTransition,
  assertRestaurantContext,
} from "../policies/restaurant.policy";
import { RestaurantApplicationSupport } from "./restaurant-application.support";

@Injectable()
export class RestaurantSetupApplication {
  constructor(private readonly support: RestaurantApplicationSupport) {}

  async getFloorPlan(
    input: GetRestaurantFloorPlanInput,
    ctx: UseCaseContext
  ): Promise<GetRestaurantFloorPlanOutput> {
    const { tenantId, workspaceId } = assertRestaurantContext(ctx);
    return { rooms: await this.support.repo.listFloorPlan(tenantId, workspaceId, input.roomId) };
  }

  async upsertDiningRoom(
    input: UpsertDiningRoomInput,
    ctx: UseCaseContext
  ): Promise<UpsertDiningRoomOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.dining-room.upsert",
      input.idempotencyKey ?? input.id ?? `room:${input.name}`,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const room = await this.support.uow.withinTransaction(async (tx) => {
          const created = await this.support.repo.upsertDiningRoom(
            tenantId,
            workspaceId,
            input,
            tx
          );
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.dining-room.upserted",
              entityType: "DiningRoom",
              entityId: created.id,
              metadata: { name: created.name },
            },
            tx
          );
          return created;
        });
        return { room };
      }
    );
  }

  async upsertTable(
    input: UpsertRestaurantTableInput,
    ctx: UseCaseContext
  ): Promise<UpsertRestaurantTableOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.table.upsert",
      input.idempotencyKey ?? input.id ?? `table:${input.diningRoomId}:${input.name}`,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const table = await this.support.uow.withinTransaction(async (tx) => {
          const saved = await this.support.repo.upsertTable(tenantId, workspaceId, input, tx);
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.table.upserted",
              entityType: "RestaurantTable",
              entityId: saved.id,
              metadata: { diningRoomId: saved.diningRoomId, name: saved.name },
            },
            tx
          );
          return saved;
        });
        return { table };
      }
    );
  }

  async listModifierGroups(
    input: ListRestaurantModifierGroupsInput,
    ctx: UseCaseContext
  ): Promise<ListRestaurantModifierGroupsOutput> {
    const { tenantId, workspaceId } = assertRestaurantContext(ctx);
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const result = await this.support.repo.listModifierGroups(tenantId, workspaceId, input);
    return {
      items: result.items,
      pageInfo: {
        page,
        pageSize,
        total: result.total,
        hasNextPage: page * pageSize < result.total,
      },
    };
  }

  async upsertModifierGroup(
    input: UpsertRestaurantModifierGroupInput,
    ctx: UseCaseContext
  ): Promise<UpsertRestaurantModifierGroupOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.modifier-group.upsert",
      input.idempotencyKey ?? input.id ?? `modifier:${input.name}`,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const modifierGroup = await this.support.uow.withinTransaction(async (tx) => {
          const saved = await this.support.repo.upsertModifierGroup(
            tenantId,
            workspaceId,
            input,
            tx
          );
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.modifier-group.upserted",
              entityType: "RestaurantModifierGroup",
              entityId: saved.id,
              metadata: { name: saved.name, optionCount: saved.options.length },
            },
            tx
          );
          return saved;
        });
        return { modifierGroup };
      }
    );
  }

  async listKitchenStations(
    input: ListKitchenStationsInput,
    ctx: UseCaseContext
  ): Promise<ListKitchenStationsOutput> {
    const { tenantId, workspaceId } = assertRestaurantContext(ctx);
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const result = await this.support.repo.listKitchenStations(tenantId, workspaceId, input);
    return {
      items: result.items,
      pageInfo: {
        page,
        pageSize,
        total: result.total,
        hasNextPage: page * pageSize < result.total,
      },
    };
  }

  async upsertKitchenStation(
    input: UpsertKitchenStationInput,
    ctx: UseCaseContext
  ): Promise<UpsertKitchenStationOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.kitchen-station.upsert",
      input.idempotencyKey ?? input.id ?? `station:${input.code}`,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const station = await this.support.uow.withinTransaction(async (tx) => {
          const saved = await this.support.repo.upsertKitchenStation(
            tenantId,
            workspaceId,
            input,
            tx
          );
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.kitchen-station.upserted",
              entityType: "KitchenStation",
              entityId: saved.id,
              metadata: { code: saved.code, name: saved.name },
            },
            tx
          );
          return saved;
        });
        return { station };
      }
    );
  }

  async listKitchenTickets(
    input: ListKitchenTicketsInput,
    ctx: UseCaseContext
  ): Promise<ListKitchenTicketsOutput> {
    const { tenantId, workspaceId } = assertRestaurantContext(ctx);
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const result = await this.support.repo.listKitchenTickets(tenantId, workspaceId, input);
    return {
      items: result.items,
      pageInfo: {
        page,
        pageSize,
        total: result.total,
        hasNextPage: page * pageSize < result.total,
      },
    };
  }

  async updateKitchenTicketStatus(
    input: UpdateKitchenTicketStatusInput,
    ctx: UseCaseContext
  ): Promise<UpdateKitchenTicketStatusOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.kitchen-ticket.status",
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const current = await this.support.repo.findKitchenTicketById(
          tenantId,
          workspaceId,
          input.ticketId
        );
        if (!current) {
          throw new NotFoundError(
            "RESTAURANT_KITCHEN_TICKET_NOT_FOUND",
            "Kitchen ticket not found"
          );
        }
        assertKitchenStatusTransition(current.status, input.status);
        const updated = await this.support.uow.withinTransaction(async (tx) => {
          const ticket = await this.support.repo.updateKitchenTicketStatus(
            tenantId,
            workspaceId,
            input.ticketId,
            input.status,
            tx
          );
          if (!ticket) {
            throw new NotFoundError(
              "RESTAURANT_KITCHEN_TICKET_NOT_FOUND",
              "Kitchen ticket not found"
            );
          }
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.kitchen-ticket.status-updated",
              entityType: "KitchenTicket",
              entityId: ticket.id,
              metadata: { status: ticket.status },
            },
            tx
          );
          if (ticket.status === "BUMPED") {
            await this.support.outbox.enqueue(
              {
                tenantId,
                eventType: "restaurant.kitchen-ticket-bumped",
                payload: { ticketId: ticket.id },
                correlationId: ticket.id,
              },
              tx
            );
          }
          return ticket;
        });
        return { ticket: updated };
      }
    );
  }
}
