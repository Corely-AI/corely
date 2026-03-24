import type {
  DiningRoom,
  KitchenStation,
  KitchenTicket,
  RestaurantApprovalRequest,
  RestaurantModifierGroup,
  RestaurantOrder,
  RestaurantTable,
  TableSession,
} from "@corely/contracts";
import type { RestaurantOrderAggregateRecord } from "../application/ports/restaurant-repository.port";

export const orderAggregateInclude = {
  session: true,
  items: {
    include: {
      modifiers: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  payments: true,
} as const;

export const kitchenTicketInclude = {
  items: {
    include: {
      orderItem: {
        include: {
          modifiers: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export function mapDiningRoom(room: {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): DiningRoom {
  return {
    id: room.id,
    tenantId: room.tenantId,
    workspaceId: room.workspaceId,
    name: room.name,
    sortOrder: room.sortOrder,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export function mapTable(table: {
  id: string;
  tenantId: string;
  workspaceId: string;
  diningRoomId: string;
  name: string;
  capacity: number | null;
  posX: number | null;
  posY: number | null;
  shape: RestaurantTable["shape"];
  availabilityStatus: RestaurantTable["availabilityStatus"];
  createdAt: Date;
  updatedAt: Date;
}): RestaurantTable {
  return {
    id: table.id,
    tenantId: table.tenantId,
    workspaceId: table.workspaceId,
    diningRoomId: table.diningRoomId,
    name: table.name,
    capacity: table.capacity,
    posX: table.posX,
    posY: table.posY,
    shape: table.shape,
    availabilityStatus: table.availabilityStatus,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
  };
}

export function mapModifierGroup(group: {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  selectionMode: RestaurantModifierGroup["selectionMode"];
  isRequired: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  options: Array<{
    id: string;
    name: string;
    priceDeltaCents: number;
    sortOrder: number;
  }>;
  linkedCatalogIds: Array<{ catalogItemId: string }>;
}): RestaurantModifierGroup {
  return {
    id: group.id,
    tenantId: group.tenantId,
    workspaceId: group.workspaceId,
    name: group.name,
    selectionMode: group.selectionMode,
    isRequired: group.isRequired,
    sortOrder: group.sortOrder,
    linkedCatalogItemIds: group.linkedCatalogIds.map((link) => link.catalogItemId),
    options: group.options.map((option) => ({
      id: option.id,
      name: option.name,
      priceDeltaCents: option.priceDeltaCents,
      sortOrder: option.sortOrder,
    })),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export function mapKitchenStation(station: {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}): KitchenStation {
  return {
    id: station.id,
    tenantId: station.tenantId,
    workspaceId: station.workspaceId,
    name: station.name,
    code: station.code,
    createdAt: station.createdAt.toISOString(),
    updatedAt: station.updatedAt.toISOString(),
  };
}

export function mapAggregate(order: {
  id: string;
  tenantId: string;
  workspaceId: string;
  tableSessionId: string;
  tableId: string;
  status: RestaurantOrder["status"];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  sentAt: Date | null;
  paidAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  session: {
    id: string;
    tenantId: string;
    workspaceId: string;
    tableId: string;
    registerId: string | null;
    shiftSessionId: string | null;
    openedByUserId: string;
    openedAt: Date;
    closedAt: Date | null;
    status: TableSession["status"];
    transferCount: number;
    createdAt: Date;
    updatedAt: Date;
  };
  items: Array<{
    id: string;
    orderId: string;
    catalogItemId: string;
    itemName: string;
    sku: string;
    quantity: number;
    sentQuantity: number;
    unitPriceCents: number;
    taxRateBps: number;
    taxCents: number;
    lineSubtotalCents: number;
    lineTotalCents: number;
    voidedAt: Date | null;
    modifiers: Array<{
      id: string;
      modifierGroupId: string | null;
      optionName: string;
      quantity: number;
      priceDeltaCents: number;
    }>;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amountCents: number;
    reference: string | null;
  }>;
}): RestaurantOrderAggregateRecord {
  return {
    session: {
      id: order.session.id,
      tenantId: order.session.tenantId,
      workspaceId: order.session.workspaceId,
      tableId: order.session.tableId,
      registerId: order.session.registerId,
      shiftSessionId: order.session.shiftSessionId,
      openedByUserId: order.session.openedByUserId,
      openedAt: order.session.openedAt.toISOString(),
      closedAt: order.session.closedAt?.toISOString() ?? null,
      status: order.session.status,
      transferCount: order.session.transferCount,
      createdAt: order.session.createdAt.toISOString(),
      updatedAt: order.session.updatedAt.toISOString(),
    },
    order: {
      id: order.id,
      tenantId: order.tenantId,
      workspaceId: order.workspaceId,
      tableSessionId: order.tableSessionId,
      tableId: order.tableId,
      status: order.status,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      sentAt: order.sentAt?.toISOString() ?? null,
      paidAt: order.paidAt?.toISOString() ?? null,
      closedAt: order.closedAt?.toISOString() ?? null,
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
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
        voidedAt: item.voidedAt?.toISOString() ?? null,
        modifiers: item.modifiers.map((modifier) => ({
          id: modifier.id,
          modifierGroupId: modifier.modifierGroupId,
          optionName: modifier.optionName,
          quantity: modifier.quantity,
          priceDeltaCents: modifier.priceDeltaCents,
        })),
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: payment.method as RestaurantOrder["payments"][number]["method"],
        amountCents: payment.amountCents,
        reference: payment.reference,
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    },
  };
}

export function mapKitchenTicket(ticket: {
  id: string;
  tenantId: string;
  workspaceId: string;
  orderId: string;
  tableSessionId: string;
  tableId: string;
  stationId: string | null;
  status: KitchenTicket["status"];
  sentAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    orderItemId: string;
    quantity: number;
    orderItem: {
      itemName: string;
      modifiers: Array<{
        id: string;
        modifierGroupId: string | null;
        optionName: string;
        quantity: number;
        priceDeltaCents: number;
      }>;
    };
  }>;
}): KitchenTicket {
  return {
    id: ticket.id,
    tenantId: ticket.tenantId,
    workspaceId: ticket.workspaceId,
    orderId: ticket.orderId,
    tableSessionId: ticket.tableSessionId,
    tableId: ticket.tableId,
    stationId: ticket.stationId,
    status: ticket.status,
    sentAt: ticket.sentAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    items: ticket.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      itemName: item.orderItem.itemName,
      quantity: item.quantity,
      modifiers: item.orderItem.modifiers.map((modifier) => ({
        id: modifier.id,
        modifierGroupId: modifier.modifierGroupId,
        optionName: modifier.optionName,
        quantity: modifier.quantity,
        priceDeltaCents: modifier.priceDeltaCents,
      })),
    })),
  };
}

export function mapApprovalRequest(request: {
  id: string;
  tenantId: string;
  workspaceId: string;
  orderId: string;
  orderItemId: string | null;
  type: RestaurantApprovalRequest["type"];
  status: RestaurantApprovalRequest["status"];
  reason: string;
  amountCents: number | null;
  workflowInstanceId: string | null;
  requestedByUserId: string;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): RestaurantApprovalRequest {
  return {
    id: request.id,
    tenantId: request.tenantId,
    workspaceId: request.workspaceId,
    orderId: request.orderId,
    orderItemId: request.orderItemId,
    type: request.type,
    status: request.status,
    reason: request.reason,
    amountCents: request.amountCents,
    workflowInstanceId: request.workflowInstanceId,
    requestedByUserId: request.requestedByUserId,
    decidedByUserId: request.decidedByUserId,
    decidedAt: request.decidedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}
