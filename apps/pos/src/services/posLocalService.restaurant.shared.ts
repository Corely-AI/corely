import { v4 as uuidv4 } from "@lukeed/uuid";
import type {
  DraftRestaurantOrderItemInput,
  FloorPlanRoom,
  RestaurantOrder,
  RestaurantOrderItem,
  TableSession,
} from "@corely/contracts";
import type {
  RestaurantAggregateState,
  RestaurantOpenTableInput,
} from "@/services/posLocalService.types";

export function createRestaurantAggregate(input: {
  workspaceId: string;
  tableId: string;
  registerId: string | null;
  shiftSessionId: string | null;
  openedByUserId: string;
  tableSessionId: string;
  orderId: string;
  openedAtIso: string;
}): RestaurantAggregateState {
  const session: TableSession = {
    id: input.tableSessionId,
    tenantId: input.workspaceId,
    workspaceId: input.workspaceId,
    tableId: input.tableId,
    registerId: input.registerId,
    shiftSessionId: input.shiftSessionId,
    openedByUserId: input.openedByUserId,
    openedAt: input.openedAtIso,
    closedAt: null,
    status: "OPEN",
    transferCount: 0,
    createdAt: input.openedAtIso,
    updatedAt: input.openedAtIso,
  };

  const order: RestaurantOrder = {
    id: input.orderId,
    tenantId: input.workspaceId,
    workspaceId: input.workspaceId,
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
    createdAt: input.openedAtIso,
    updatedAt: input.openedAtIso,
  };

  return {
    session,
    order,
    syncStatus: "PENDING",
    lastError: null,
    commandVersion: 0,
  };
}

export function replaceRestaurantDraftState(
  current: RestaurantAggregateState,
  items: DraftRestaurantOrderItemInput[],
  discountCents: number,
  nowIso: string
): RestaurantAggregateState {
  const next = cloneAggregate(current);

  if (next.order.status === "CLOSED" || next.order.status === "CANCELLED") {
    throw new Error("Closed orders cannot be edited");
  }

  const existingById = new Map(next.order.items.map((item) => [item.id, item]));
  const nextItems: RestaurantOrderItem[] = [];

  for (const existing of next.order.items) {
    if (existing.sentQuantity > 0 || existing.voidedAt) {
      const incoming = items.find((item) => item.id === existing.id);
      if (!incoming) {
        throw new Error("Sent or voided items must remain unchanged in draft updates");
      }
      assertLockedItemUnchanged(existing, incoming);
    }
  }

  for (const input of items) {
    const existing = input.id ? existingById.get(input.id) : undefined;
    if (existing?.sentQuantity && existing.sentQuantity > 0) {
      nextItems.push(existing);
      continue;
    }

    nextItems.push(toOrderItem(input, next.order.id, existing));
  }

  next.order.items = nextItems;
  next.order.discountCents = Math.max(0, discountCents);
  next.order.updatedAt = nowIso;
  next.commandVersion += 1;
  next.syncStatus = "PENDING";
  next.lastError = null;
  refreshOrderTotals(next.order);
  return next;
}

export function sendRestaurantOrderState(
  current: RestaurantAggregateState,
  nowIso: string
): RestaurantAggregateState {
  const next = cloneAggregate(current);
  const pending = next.order.items.filter((item) => item.sentQuantity === 0 && !item.voidedAt);
  if (pending.length === 0) {
    throw new Error("No draft items are waiting for send");
  }

  for (const item of pending) {
    item.sentQuantity = item.quantity;
  }

  next.order.sentAt = nowIso;
  next.order.updatedAt = nowIso;
  next.commandVersion += 1;
  next.syncStatus = "PENDING";
  next.lastError = null;
  refreshOrderTotals(next.order);
  return next;
}

export function overlayRestaurantFloorPlan(
  rooms: FloorPlanRoom[],
  aggregates: RestaurantAggregateState[]
): FloorPlanRoom[] {
  const nextRooms = cloneRooms(rooms);
  const activeByTableId = new Map(
    aggregates
      .filter(
        (aggregate) =>
          aggregate.session.status === "OPEN" &&
          aggregate.order.status !== "CLOSED" &&
          aggregate.order.status !== "CANCELLED"
      )
      .map((aggregate) => [aggregate.order.tableId, aggregate])
  );

  for (const room of nextRooms) {
    room.tables = room.tables.map((table) => {
      const active = activeByTableId.get(table.id);
      if (!active) {
        return table;
      }
      return {
        ...table,
        availabilityStatus: "OCCUPIED",
        activeSessionId: active.session.id,
        activeOrderId: active.order.id,
      };
    });
  }

  return nextRooms;
}

export function cloneAggregate(state: RestaurantAggregateState): RestaurantAggregateState {
  return JSON.parse(JSON.stringify(state)) as RestaurantAggregateState;
}

export function cloneRooms(rooms: FloorPlanRoom[]): FloorPlanRoom[] {
  return JSON.parse(JSON.stringify(rooms)) as FloorPlanRoom[];
}

export function cloneModifierGroups<T>(groups: T[]): T[] {
  return JSON.parse(JSON.stringify(groups)) as T[];
}

function assertLockedItemUnchanged(
  existing: RestaurantOrderItem,
  incoming: DraftRestaurantOrderItemInput
): void {
  const incomingModifiers = incoming.modifiers.map((modifier) => ({
    modifierGroupId: modifier.modifierGroupId ?? null,
    optionName: modifier.optionName,
    quantity: modifier.quantity,
    priceDeltaCents: modifier.priceDeltaCents,
  }));
  const existingModifiers = existing.modifiers.map((modifier) => ({
    modifierGroupId: modifier.modifierGroupId,
    optionName: modifier.optionName,
    quantity: modifier.quantity,
    priceDeltaCents: modifier.priceDeltaCents,
  }));

  const unchanged =
    existing.catalogItemId === incoming.catalogItemId &&
    existing.itemName === incoming.itemName &&
    existing.sku === incoming.sku &&
    existing.quantity === incoming.quantity &&
    existing.unitPriceCents === incoming.unitPriceCents &&
    existing.taxRateBps === incoming.taxRateBps &&
    JSON.stringify(existingModifiers) === JSON.stringify(incomingModifiers);

  if (!unchanged) {
    throw new Error("Sent or voided items cannot be modified");
  }
}

function refreshOrderTotals(order: RestaurantOrder): void {
  let subtotal = 0;
  let tax = 0;
  for (const item of order.items) {
    if (item.voidedAt) {
      continue;
    }
    subtotal += item.lineSubtotalCents;
    tax += item.taxCents;
  }

  order.subtotalCents = subtotal;
  order.taxCents = tax;
  order.totalCents = Math.max(0, subtotal + tax - order.discountCents);

  if (order.status === "CLOSED") {
    return;
  }

  const activeItems = order.items.filter((item) => !item.voidedAt);
  const hasSent = activeItems.some((item) => item.sentQuantity > 0);
  const hasDraft = activeItems.some((item) => item.sentQuantity === 0);

  if (hasSent && hasDraft) {
    order.status = "PARTIALLY_SENT";
  } else if (hasSent) {
    order.status = "SENT";
  } else {
    order.status = "DRAFT";
  }
}

function toOrderItem(
  input: DraftRestaurantOrderItemInput,
  orderId: string,
  existing?: RestaurantOrderItem
): RestaurantOrderItem {
  const modifiers = input.modifiers.map((modifier) => ({
    id: modifier.id ?? uuidv4(),
    modifierGroupId: modifier.modifierGroupId ?? null,
    optionName: modifier.optionName,
    quantity: modifier.quantity,
    priceDeltaCents: modifier.priceDeltaCents,
  }));
  const modifiersSubtotal = modifiers.reduce(
    (sum, modifier) => sum + modifier.priceDeltaCents * modifier.quantity,
    0
  );
  const baseSubtotal = input.unitPriceCents * input.quantity;
  const lineSubtotal = baseSubtotal + modifiersSubtotal;
  const taxCents = Math.round((lineSubtotal * input.taxRateBps) / 10_000);

  return {
    id: input.id ?? uuidv4(),
    orderId,
    catalogItemId: input.catalogItemId,
    itemName: input.itemName,
    sku: input.sku,
    quantity: input.quantity,
    sentQuantity: existing?.sentQuantity ?? 0,
    unitPriceCents: input.unitPriceCents,
    taxRateBps: input.taxRateBps,
    taxCents,
    lineSubtotalCents: lineSubtotal,
    lineTotalCents: lineSubtotal + taxCents,
    voidedAt: existing?.voidedAt ?? null,
    modifiers,
  };
}
