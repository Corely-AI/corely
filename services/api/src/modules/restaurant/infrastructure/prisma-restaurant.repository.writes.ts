import { type PrismaService, getPrismaClient } from "@corely/data";
import type {
  KitchenTicket,
  RestaurantModifierGroup,
  UpsertRestaurantModifierGroupInput,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type { RestaurantOrderAggregateRecord } from "../application/ports/restaurant-repository.port";
import {
  kitchenTicketInclude,
  mapAggregate,
  mapKitchenTicket,
  mapModifierGroup,
  orderAggregateInclude,
} from "./prisma-restaurant.repository.mappers";

export async function upsertModifierGroupRecord(
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  input: UpsertRestaurantModifierGroupInput,
  tx?: TransactionContext
): Promise<RestaurantModifierGroup> {
  const client = getPrismaClient(prisma, tx);
  const group = input.id
    ? await client.restaurantModifierGroup.update({
        where: { id: input.id },
        data: {
          name: input.name,
          selectionMode: input.selectionMode,
          isRequired: input.isRequired,
          sortOrder: input.sortOrder,
        },
      })
    : await client.restaurantModifierGroup.create({
        data: {
          tenantId,
          workspaceId,
          name: input.name,
          selectionMode: input.selectionMode,
          isRequired: input.isRequired,
          sortOrder: input.sortOrder,
        },
      });

  await client.restaurantModifierOption.deleteMany({
    where: { tenantId, workspaceId, modifierGroupId: group.id },
  });
  if (input.options.length > 0) {
    await client.restaurantModifierOption.createMany({
      data: input.options.map((option) => ({
        id: option.id ?? `rmo_${group.id}_${option.sortOrder}_${option.name}`.slice(0, 191),
        tenantId,
        workspaceId,
        modifierGroupId: group.id,
        name: option.name,
        priceDeltaCents: option.priceDeltaCents,
        sortOrder: option.sortOrder,
      })),
    });
  }

  await client.restaurantMenuItemModifierGroup.deleteMany({
    where: { tenantId, workspaceId, modifierGroupId: group.id },
  });
  if (input.linkedCatalogItemIds.length > 0) {
    await client.restaurantMenuItemModifierGroup.createMany({
      data: input.linkedCatalogItemIds.map((catalogItemId, index) => ({
        tenantId,
        workspaceId,
        catalogItemId,
        modifierGroupId: group.id,
        sortOrder: index,
      })),
    });
  }

  const fresh = await client.restaurantModifierGroup.findUniqueOrThrow({
    where: { id: group.id },
    include: {
      options: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      linkedCatalogIds: { orderBy: { sortOrder: "asc" } },
    },
  });
  return mapModifierGroup(fresh);
}

export async function saveAggregateRecord(
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  aggregate: RestaurantOrderAggregateRecord,
  tx?: TransactionContext
): Promise<RestaurantOrderAggregateRecord> {
  const client = getPrismaClient(prisma, tx);

  await client.restaurantTableSession.update({
    where: { id: aggregate.session.id },
    data: {
      tableId: aggregate.session.tableId,
      status: aggregate.session.status,
      closedAt: aggregate.session.closedAt ? new Date(aggregate.session.closedAt) : null,
      transferCount: aggregate.session.transferCount,
    },
  });

  await client.restaurantOrder.update({
    where: { id: aggregate.order.id },
    data: {
      tableId: aggregate.order.tableId,
      status: aggregate.order.status,
      subtotalCents: aggregate.order.subtotalCents,
      discountCents: aggregate.order.discountCents,
      taxCents: aggregate.order.taxCents,
      totalCents: aggregate.order.totalCents,
      sentAt: aggregate.order.sentAt ? new Date(aggregate.order.sentAt) : null,
      paidAt: aggregate.order.paidAt ? new Date(aggregate.order.paidAt) : null,
      closedAt: aggregate.order.closedAt ? new Date(aggregate.order.closedAt) : null,
    },
  });

  const existingItems = await client.restaurantOrderItem.findMany({
    where: { tenantId, workspaceId, orderId: aggregate.order.id },
  });
  const nextIds = new Set(aggregate.order.items.map((item) => item.id));
  const removableIds = existingItems
    .filter((item) => item.sentQuantity === 0 && item.voidedAt === null && !nextIds.has(item.id))
    .map((item) => item.id);

  if (removableIds.length > 0) {
    await client.restaurantOrderItemModifier.deleteMany({
      where: { tenantId, workspaceId, orderItemId: { in: removableIds } },
    });
    await client.restaurantOrderItem.deleteMany({
      where: { tenantId, workspaceId, id: { in: removableIds } },
    });
  }

  for (const item of aggregate.order.items) {
    await client.restaurantOrderItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        tenantId,
        workspaceId,
        orderId: aggregate.order.id,
        catalogItemId: item.catalogItemId,
        itemName: item.itemName,
        sku: item.sku,
        quantity: item.quantity,
        sentQuantity: item.sentQuantity,
        unitPriceCents: item.unitPriceCents,
        taxRateBps: item.taxRateBps,
        taxCents: item.taxCents,
        lineSubtotalCents: item.lineSubtotalCents,
        lineTotalCents: item.lineTotalCents,
        voidedAt: item.voidedAt ? new Date(item.voidedAt) : null,
      },
      update: {
        quantity: item.quantity,
        sentQuantity: item.sentQuantity,
        unitPriceCents: item.unitPriceCents,
        taxRateBps: item.taxRateBps,
        taxCents: item.taxCents,
        lineSubtotalCents: item.lineSubtotalCents,
        lineTotalCents: item.lineTotalCents,
        voidedAt: item.voidedAt ? new Date(item.voidedAt) : null,
        itemName: item.itemName,
        sku: item.sku,
      },
    });

    await client.restaurantOrderItemModifier.deleteMany({
      where: { tenantId, workspaceId, orderItemId: item.id },
    });
    if (item.modifiers.length > 0) {
      await client.restaurantOrderItemModifier.createMany({
        data: item.modifiers.map((modifier) => ({
          id: modifier.id,
          tenantId,
          workspaceId,
          orderItemId: item.id,
          modifierGroupId: modifier.modifierGroupId,
          optionName: modifier.optionName,
          quantity: modifier.quantity,
          priceDeltaCents: modifier.priceDeltaCents,
        })),
      });
    }
  }

  await client.restaurantOrderPayment.deleteMany({
    where: { tenantId, workspaceId, orderId: aggregate.order.id },
  });
  if (aggregate.order.payments.length > 0) {
    await client.restaurantOrderPayment.createMany({
      data: aggregate.order.payments.map((payment) => ({
        id: payment.id,
        tenantId,
        workspaceId,
        orderId: aggregate.order.id,
        method: payment.method,
        amountCents: payment.amountCents,
        reference: payment.reference,
      })),
    });
  }

  const fresh = await client.restaurantOrder.findUniqueOrThrow({
    where: { id: aggregate.order.id },
    include: orderAggregateInclude,
  });
  return mapAggregate(fresh);
}

export async function createKitchenTicketsForSendRecord(
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  aggregate: RestaurantOrderAggregateRecord,
  sendKey: string,
  tx?: TransactionContext
): Promise<KitchenTicket[]> {
  const client = getPrismaClient(prisma, tx);
  const existing = await client.kitchenTicket.findMany({
    where: { tenantId, workspaceId, sendKey },
    include: kitchenTicketInclude,
  });
  if (existing.length > 0) {
    return existing.map(mapKitchenTicket);
  }

  const station = await client.kitchenStation.findFirst({
    where: { tenantId, workspaceId },
    orderBy: { createdAt: "asc" },
  });
  const sendItems = aggregate.order.items.filter((item) => item.sentQuantity > 0 && !item.voidedAt);
  const ticket = await client.kitchenTicket.create({
    data: {
      tenantId,
      workspaceId,
      orderId: aggregate.order.id,
      tableSessionId: aggregate.session.id,
      tableId: aggregate.order.tableId,
      stationId: station?.id ?? null,
      sendKey,
      status: "NEW",
      sentAt: new Date(aggregate.order.sentAt ?? new Date().toISOString()),
      items: {
        create: sendItems.map((item) => ({
          tenantId,
          workspaceId,
          orderItemId: item.id,
          quantity: item.quantity,
        })),
      },
    },
    include: kitchenTicketInclude,
  });
  return [mapKitchenTicket(ticket)];
}
