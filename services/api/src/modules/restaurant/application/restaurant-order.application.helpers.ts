import type { CloseRestaurantTableOutput, MergeRestaurantChecksOutput } from "@corely/contracts";
import type { RestaurantOrderAggregate } from "../domain/restaurant-order.aggregate";
import type { RestaurantApplicationSupport } from "./restaurant-application.support";

export async function persistMergedChecks(input: {
  support: RestaurantApplicationSupport;
  tenantId: string;
  workspaceId: string;
  userId: string;
  sourceDomain: RestaurantOrderAggregate;
  targetDomain: RestaurantOrderAggregate;
}): Promise<MergeRestaurantChecksOutput> {
  const { support, tenantId, workspaceId, userId, sourceDomain, targetDomain } = input;

  return support.uow.withinTransaction(async (tx) => {
    await support.repo.saveAggregate(
      tenantId,
      workspaceId,
      { session: sourceDomain.session, order: sourceDomain.order },
      tx
    );
    const persistedTarget = await support.repo.saveAggregate(
      tenantId,
      workspaceId,
      { session: targetDomain.session, order: targetDomain.order },
      tx
    );
    await support.audit.log(
      {
        tenantId,
        userId,
        action: "restaurant.table.merged",
        entityType: "RestaurantOrder",
        entityId: persistedTarget.order.id,
        metadata: {
          sourceOrderId: sourceDomain.order.id,
          sourceTableSessionId: sourceDomain.session.id,
          targetTableSessionId: persistedTarget.session.id,
          mergedItemCount: sourceDomain.order.items.length,
        },
      },
      tx
    );
    await support.outbox.enqueue(
      {
        tenantId,
        eventType: "restaurant.table-merged",
        payload: {
          targetOrderId: persistedTarget.order.id,
          sourceOrderId: sourceDomain.order.id,
          sourceTableSessionId: sourceDomain.session.id,
          targetTableSessionId: persistedTarget.session.id,
        },
        correlationId: persistedTarget.order.id,
      },
      tx
    );
    return {
      session: persistedTarget.session,
      order: persistedTarget.order,
      sourceSessionId: sourceDomain.session.id,
      sourceOrderId: sourceDomain.order.id,
    };
  });
}

export async function persistClosedTable(input: {
  support: RestaurantApplicationSupport;
  tenantId: string;
  workspaceId: string;
  userId: string;
  domain: RestaurantOrderAggregate;
}): Promise<CloseRestaurantTableOutput> {
  const { support, tenantId, workspaceId, userId, domain } = input;

  const saved = await support.uow.withinTransaction(async (tx) => {
    const persisted = await support.repo.saveAggregate(
      tenantId,
      workspaceId,
      { session: domain.session, order: domain.order },
      tx
    );
    await support.audit.log(
      {
        tenantId,
        userId,
        action: "restaurant.table.closed",
        entityType: "RestaurantOrder",
        entityId: persisted.order.id,
        metadata: {
          sessionId: persisted.session.id,
          totalCents: persisted.order.totalCents,
          paymentCount: persisted.order.payments.length,
        },
      },
      tx
    );
    await support.outbox.enqueue(
      {
        tenantId,
        eventType: "restaurant.payment-captured",
        payload: { orderId: persisted.order.id, totalCents: persisted.order.totalCents },
        correlationId: persisted.order.id,
      },
      tx
    );
    await support.outbox.enqueue(
      {
        tenantId,
        eventType: "restaurant.table-closed",
        payload: { orderId: persisted.order.id, tableSessionId: persisted.session.id },
        correlationId: persisted.order.id,
      },
      tx
    );
    return persisted;
  });

  return {
    order: saved.order,
    session: saved.session,
    finalizedSaleRef: `restaurant-sale:${saved.order.id}`,
  };
}
