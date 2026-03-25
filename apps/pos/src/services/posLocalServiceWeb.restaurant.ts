import { v4 as uuidv4 } from "@lukeed/uuid";
import type { OutboxCommand } from "@corely/offline-core";
import type {
  FloorPlanRoom,
  RestaurantModifierGroup,
  RestaurantOrder,
  TableSession,
} from "@corely/contracts";
import {
  buildDeterministicIdempotencyKey,
  createPosOutboxCommand,
  PosCommandTypes,
} from "@/offline/posOutbox";
import {
  cloneAggregate,
  cloneModifierGroups,
  cloneRooms,
  createRestaurantAggregate,
  overlayRestaurantFloorPlan,
  replaceRestaurantDraftState,
  sendRestaurantOrderState,
} from "@/services/posLocalService.restaurant.shared";
import type {
  RestaurantAggregateState,
  RestaurantDraftUpdateInput,
  RestaurantDraftUpdateResult,
  RestaurantOfflineSnapshot,
  RestaurantOpenTableInput,
  RestaurantOpenTableResult,
  RestaurantSendInput,
  RestaurantSendResult,
} from "@/services/posLocalService";

export type WebRestaurantState = {
  restaurantFloorPlan: FloorPlanRoom[];
  restaurantModifierGroups: RestaurantModifierGroup[];
  restaurantAggregatesByOrderId: Map<string, RestaurantAggregateState>;
};

export async function cacheRestaurantSnapshotWeb(
  state: WebRestaurantState,
  rooms: FloorPlanRoom[],
  modifierGroups: RestaurantModifierGroup[]
): Promise<void> {
  state.restaurantFloorPlan = cloneRooms(rooms);
  state.restaurantModifierGroups = cloneModifierGroups(modifierGroups);
}

export async function getRestaurantSnapshotWeb(
  state: WebRestaurantState
): Promise<RestaurantOfflineSnapshot> {
  return {
    rooms: overlayRestaurantFloorPlan(
      state.restaurantFloorPlan,
      Array.from(state.restaurantAggregatesByOrderId.values()).map((aggregate) =>
        cloneAggregate(aggregate)
      )
    ),
    modifierGroups: cloneModifierGroups(state.restaurantModifierGroups),
  };
}

export async function getRestaurantAggregateByTableWeb(
  state: WebRestaurantState,
  tableId: string
): Promise<RestaurantAggregateState | null> {
  const aggregate =
    Array.from(state.restaurantAggregatesByOrderId.values())
      .filter(
        (candidate) =>
          candidate.order.tableId === tableId &&
          candidate.session.status === "OPEN" &&
          candidate.order.status !== "CLOSED" &&
          candidate.order.status !== "CANCELLED"
      )
      .sort((left, right) => right.order.updatedAt.localeCompare(left.order.updatedAt))[0] ?? null;

  return aggregate ? cloneAggregate(aggregate) : null;
}

export async function upsertRestaurantAggregateWeb(
  state: WebRestaurantState,
  session: TableSession,
  order: RestaurantOrder
): Promise<void> {
  const existing = state.restaurantAggregatesByOrderId.get(order.id);
  const aggregate = cloneAggregate({
    session,
    order,
    syncStatus: existing?.syncStatus ?? "SYNCED",
    lastError: existing?.lastError ?? null,
    commandVersion: existing?.commandVersion ?? 0,
  });

  state.restaurantAggregatesByOrderId.set(order.id, aggregate);
}

export async function openRestaurantTableAndEnqueueWeb(
  state: WebRestaurantState,
  input: RestaurantOpenTableInput
): Promise<RestaurantOpenTableResult> {
  const existing = await getRestaurantAggregateByTableWeb(state, input.tableId);
  if (existing) {
    throw new Error("Table already has an active local session");
  }

  const nowIso = new Date().toISOString();
  const tableSessionId = uuidv4();
  const orderId = uuidv4();
  const aggregate = createRestaurantAggregate({
    workspaceId: input.workspaceId,
    tableId: input.tableId,
    registerId: input.registerId,
    shiftSessionId: input.shiftSessionId,
    openedByUserId: input.openedByUserId,
    tableSessionId,
    orderId,
    openedAtIso: nowIso,
  });
  const payload = {
    tableSessionId,
    orderId,
    tableId: input.tableId,
    registerId: input.registerId,
    shiftSessionId: input.shiftSessionId,
    openedAt: nowIso,
    notes: input.notes ?? null,
    idempotencyKey: buildDeterministicIdempotencyKey.restaurantTableOpen(tableSessionId),
  };
  const command = createPosOutboxCommand(
    input.workspaceId,
    PosCommandTypes.RestaurantTableOpen,
    payload,
    payload.idempotencyKey
  ) as OutboxCommand<typeof payload>;

  state.restaurantAggregatesByOrderId.set(orderId, cloneAggregate(aggregate));

  return {
    session: aggregate.session,
    order: aggregate.order,
    command,
  };
}

export async function replaceRestaurantDraftAndEnqueueWeb(
  state: WebRestaurantState,
  input: RestaurantDraftUpdateInput
): Promise<RestaurantDraftUpdateResult> {
  const existing = state.restaurantAggregatesByOrderId.get(input.orderId);
  if (!existing) {
    throw new Error("Restaurant order not found in local cache");
  }

  const next = replaceRestaurantDraftState(
    existing,
    input.items,
    input.discountCents,
    new Date().toISOString()
  );
  const payload = {
    orderId: input.orderId,
    items: input.items,
    discountCents: input.discountCents,
    idempotencyKey: buildDeterministicIdempotencyKey.restaurantDraftReplace(
      input.orderId,
      next.commandVersion
    ),
  };
  const command = createPosOutboxCommand(
    input.workspaceId,
    PosCommandTypes.RestaurantDraftReplace,
    payload,
    payload.idempotencyKey
  ) as OutboxCommand<typeof payload>;

  state.restaurantAggregatesByOrderId.set(input.orderId, cloneAggregate(next));

  return {
    session: next.session,
    order: next.order,
    command,
  };
}

export async function sendRestaurantOrderAndEnqueueWeb(
  state: WebRestaurantState,
  input: RestaurantSendInput
): Promise<RestaurantSendResult> {
  const existing = state.restaurantAggregatesByOrderId.get(input.orderId);
  if (!existing) {
    throw new Error("Restaurant order not found in local cache");
  }

  const next = sendRestaurantOrderState(existing, new Date().toISOString());
  const payload = {
    orderId: input.orderId,
    idempotencyKey: buildDeterministicIdempotencyKey.restaurantSendToKitchen(
      input.orderId,
      next.commandVersion
    ),
  };
  const command = createPosOutboxCommand(
    input.workspaceId,
    PosCommandTypes.RestaurantSendToKitchen,
    payload,
    payload.idempotencyKey
  ) as OutboxCommand<typeof payload>;

  state.restaurantAggregatesByOrderId.set(input.orderId, cloneAggregate(next));

  return {
    session: next.session,
    order: next.order,
    command,
  };
}

export async function markRestaurantOrderSyncedWeb(
  state: WebRestaurantState,
  orderId: string,
  next?: { session?: TableSession; order?: RestaurantOrder }
): Promise<void> {
  const existing = state.restaurantAggregatesByOrderId.get(orderId);
  if (!existing) {
    return;
  }

  state.restaurantAggregatesByOrderId.set(orderId, {
    ...cloneAggregate(existing),
    session: next?.session
      ? cloneAggregate({ ...existing, session: next.session }).session
      : cloneAggregate(existing).session,
    order: next?.order
      ? cloneAggregate({ ...existing, order: next.order }).order
      : cloneAggregate(existing).order,
    syncStatus: "SYNCED",
    lastError: null,
  });
}

export async function markRestaurantOrderSyncFailureWeb(
  state: WebRestaurantState,
  orderId: string,
  reason: string
): Promise<void> {
  const existing = state.restaurantAggregatesByOrderId.get(orderId);
  if (!existing) {
    return;
  }

  state.restaurantAggregatesByOrderId.set(orderId, {
    ...cloneAggregate(existing),
    syncStatus: "FAILED",
    lastError: reason,
  });
}
