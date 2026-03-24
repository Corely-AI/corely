import { Injectable } from "@nestjs/common";
import type {
  CloseRestaurantTableInput,
  CloseRestaurantTableOutput,
  GetActiveRestaurantOrderInput,
  GetActiveRestaurantOrderOutput,
  MergeRestaurantChecksInput,
  MergeRestaurantChecksOutput,
  OpenRestaurantTableInput,
  OpenRestaurantTableOutput,
  PutRestaurantDraftOrderInput,
  PutRestaurantDraftOrderOutput,
  SendRestaurantOrderToKitchenInput,
  SendRestaurantOrderToKitchenOutput,
  TransferRestaurantTableInput,
  TransferRestaurantTableOutput,
} from "@corely/contracts";
import { ConflictError, NotFoundError, type UseCaseContext } from "@corely/kernel";
import { RestaurantOrderAggregate } from "../domain/restaurant-order.aggregate";
import { assertRestaurantContext } from "../policies/restaurant.policy";
import type { RestaurantOrderAggregateRecord } from "./ports/restaurant-repository.port";
import { persistClosedTable, persistMergedChecks } from "./restaurant-order.application.helpers";
import { RestaurantApplicationSupport } from "./restaurant-application.support";

@Injectable()
export class RestaurantOrderApplication {
  constructor(private readonly support: RestaurantApplicationSupport) {}

  async openTable(
    input: OpenRestaurantTableInput,
    ctx: UseCaseContext
  ): Promise<OpenRestaurantTableOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.table.open",
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const table = await this.support.repo.findTableById(tenantId, workspaceId, input.tableId);
        if (!table) {
          throw new NotFoundError("RESTAURANT_TABLE_NOT_FOUND", "Restaurant table not found");
        }
        if (table.availabilityStatus === "OUT_OF_SERVICE") {
          throw new ConflictError("RESTAURANT_TABLE_OUT_OF_SERVICE", "Table is out of service");
        }
        const existing = await this.support.repo.findActiveOrderByTable(
          tenantId,
          workspaceId,
          input.tableId
        );
        if (existing) {
          throw new ConflictError(
            "RESTAURANT_TABLE_ALREADY_OPEN",
            "Table already has an active session"
          );
        }

        const nowIso = input.openedAt ?? new Date().toISOString();
        const aggregate: RestaurantOrderAggregateRecord = {
          session: {
            id: input.tableSessionId,
            tenantId,
            workspaceId,
            tableId: input.tableId,
            registerId: input.registerId ?? null,
            shiftSessionId: input.shiftSessionId ?? null,
            openedByUserId: userId,
            openedAt: nowIso,
            closedAt: null,
            status: "OPEN",
            transferCount: 0,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          order: {
            id: input.orderId,
            tenantId,
            workspaceId,
            tableSessionId: input.tableSessionId,
            tableId: input.tableId,
            status: "DRAFT",
            subtotalCents: 0,
            discountCents: 0,
            taxCents: 0,
            totalCents: 0,
            sentAt: null,
            paidAt: null,
            closedAt: null,
            items: [],
            payments: [],
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        };

        return this.support.uow.withinTransaction(async (tx) => {
          const created = await this.support.repo.createOpenTable(
            tenantId,
            workspaceId,
            aggregate,
            tx
          );
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.table.opened",
              entityType: "RestaurantTableSession",
              entityId: created.session.id,
              metadata: { orderId: created.order.id, tableId: created.session.tableId },
            },
            tx
          );
          await this.support.outbox.enqueue(
            {
              tenantId,
              eventType: "restaurant.table-opened",
              payload: {
                tableSessionId: created.session.id,
                orderId: created.order.id,
                tableId: created.session.tableId,
              },
              correlationId: created.order.id,
            },
            tx
          );
          return created;
        });
      }
    );
  }

  async getActiveOrder(
    input: GetActiveRestaurantOrderInput,
    ctx: UseCaseContext
  ): Promise<GetActiveRestaurantOrderOutput> {
    const { tenantId, workspaceId } = assertRestaurantContext(ctx);
    const aggregate = await this.support.repo.findActiveOrderByTable(
      tenantId,
      workspaceId,
      input.tableId
    );
    return {
      session: aggregate?.session ?? null,
      order: aggregate?.order ?? null,
    };
  }

  async putDraftOrder(
    input: PutRestaurantDraftOrderInput,
    ctx: UseCaseContext
  ): Promise<PutRestaurantDraftOrderOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.order.put-draft",
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const aggregate = await this.support.requireAggregate(tenantId, workspaceId, input.orderId);
        const domain = new RestaurantOrderAggregate(aggregate.session, aggregate.order);
        domain.replaceDraft(input.items, input.discountCents);
        const saved = await this.support.uow.withinTransaction(async (tx) => {
          const persisted = await this.support.repo.saveAggregate(
            tenantId,
            workspaceId,
            { session: domain.session, order: domain.order },
            tx
          );
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.order.draft-updated",
              entityType: "RestaurantOrder",
              entityId: persisted.order.id,
              metadata: {
                itemCount: persisted.order.items.length,
                discountCents: persisted.order.discountCents,
              },
            },
            tx
          );
          await this.support.outbox.enqueue(
            {
              tenantId,
              eventType: "restaurant.order-draft-updated",
              payload: { orderId: persisted.order.id, itemCount: persisted.order.items.length },
              correlationId: persisted.order.id,
            },
            tx
          );
          return persisted;
        });
        return { order: saved.order };
      }
    );
  }

  async transferTable(
    input: TransferRestaurantTableInput,
    ctx: UseCaseContext
  ): Promise<TransferRestaurantTableOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.table.transfer",
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const toTable = await this.support.repo.findTableById(
          tenantId,
          workspaceId,
          input.toTableId
        );
        if (!toTable) {
          throw new NotFoundError("RESTAURANT_TABLE_NOT_FOUND", "Destination table not found");
        }
        const conflict = await this.support.repo.findActiveOrderByTable(
          tenantId,
          workspaceId,
          input.toTableId
        );
        if (conflict) {
          throw new ConflictError(
            "RESTAURANT_TRANSFER_TARGET_OCCUPIED",
            "Destination table is already occupied"
          );
        }
        const aggregate = await this.support.requireAggregate(tenantId, workspaceId, input.orderId);
        if (aggregate.session.id !== input.tableSessionId) {
          throw new ConflictError(
            "RESTAURANT_SESSION_ORDER_MISMATCH",
            "Session does not belong to order"
          );
        }

        const domain = new RestaurantOrderAggregate(aggregate.session, aggregate.order);
        domain.transfer(input.toTableId);
        return this.support.uow.withinTransaction(async (tx) => {
          const persisted = await this.support.repo.saveAggregate(
            tenantId,
            workspaceId,
            { session: domain.session, order: domain.order },
            tx
          );
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.table.transferred",
              entityType: "RestaurantTableSession",
              entityId: persisted.session.id,
              metadata: { toTableId: input.toTableId, orderId: persisted.order.id },
            },
            tx
          );
          await this.support.outbox.enqueue(
            {
              tenantId,
              eventType: "restaurant.table-transferred",
              payload: {
                orderId: persisted.order.id,
                tableSessionId: persisted.session.id,
                toTableId: input.toTableId,
              },
              correlationId: persisted.order.id,
            },
            tx
          );
          return persisted;
        });
      }
    );
  }

  async mergeChecks(
    input: MergeRestaurantChecksInput,
    ctx: UseCaseContext
  ): Promise<MergeRestaurantChecksOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.table.merge",
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        if (input.sourceOrderId === input.targetOrderId) {
          throw new ConflictError(
            "RESTAURANT_MERGE_SAME_CHECK",
            "Source and target checks must be different"
          );
        }

        const source = await this.support.requireAggregate(
          tenantId,
          workspaceId,
          input.sourceOrderId
        );
        const target = await this.support.requireAggregate(
          tenantId,
          workspaceId,
          input.targetOrderId
        );

        if (source.session.id !== input.sourceTableSessionId) {
          throw new ConflictError(
            "RESTAURANT_SESSION_ORDER_MISMATCH",
            "Source session does not belong to source order"
          );
        }
        if (target.session.id !== input.targetTableSessionId) {
          throw new ConflictError(
            "RESTAURANT_SESSION_ORDER_MISMATCH",
            "Target session does not belong to target order"
          );
        }

        const sourceDomain = new RestaurantOrderAggregate(source.session, source.order);
        const targetDomain = new RestaurantOrderAggregate(target.session, target.order);
        RestaurantOrderAggregate.merge(sourceDomain, targetDomain, new Date().toISOString());

        return persistMergedChecks({
          support: this.support,
          tenantId,
          workspaceId,
          userId,
          sourceDomain,
          targetDomain,
        });
      }
    );
  }

  async sendOrderToKitchen(
    input: SendRestaurantOrderToKitchenInput,
    ctx: UseCaseContext
  ): Promise<SendRestaurantOrderToKitchenOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.order.send",
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const aggregate = await this.support.requireAggregate(tenantId, workspaceId, input.orderId);
        const domain = new RestaurantOrderAggregate(aggregate.session, aggregate.order);
        domain.sendPending(new Date().toISOString());

        const saved = await this.support.uow.withinTransaction(async (tx) => {
          const persisted = await this.support.repo.saveAggregate(
            tenantId,
            workspaceId,
            { session: domain.session, order: domain.order },
            tx
          );
          const tickets = await this.support.repo.createKitchenTicketsForSend(
            tenantId,
            workspaceId,
            persisted,
            input.idempotencyKey,
            tx
          );
          await this.support.audit.log(
            {
              tenantId,
              userId,
              action: "restaurant.order.sent-to-kitchen",
              entityType: "RestaurantOrder",
              entityId: persisted.order.id,
              metadata: { ticketCount: tickets.length },
            },
            tx
          );
          await this.support.outbox.enqueue(
            {
              tenantId,
              eventType: "restaurant.order-sent-to-kitchen",
              payload: {
                orderId: persisted.order.id,
                ticketIds: tickets.map((ticket) => ticket.id),
              },
              correlationId: persisted.order.id,
            },
            tx
          );
          return { persisted, tickets };
        });
        return { order: saved.persisted.order, tickets: saved.tickets };
      }
    );
  }

  async closeTable(
    input: CloseRestaurantTableInput,
    ctx: UseCaseContext
  ): Promise<CloseRestaurantTableOutput> {
    return this.support.withWrite(
      ctx,
      "restaurant.table.close",
      input.idempotencyKey,
      input,
      async ({ tenantId, workspaceId, userId }) => {
        const aggregate = await this.support.requireAggregate(tenantId, workspaceId, input.orderId);
        if (aggregate.session.id !== input.tableSessionId) {
          throw new ConflictError(
            "RESTAURANT_SESSION_ORDER_MISMATCH",
            "Session does not belong to order"
          );
        }
        const domain = new RestaurantOrderAggregate(aggregate.session, aggregate.order);
        domain.close(input.payments, new Date().toISOString());

        return persistClosedTable({
          support: this.support,
          tenantId,
          workspaceId,
          userId,
          domain,
        });
      }
    );
  }
}
