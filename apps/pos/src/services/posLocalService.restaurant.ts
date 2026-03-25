import { v4 as uuidv4 } from "@lukeed/uuid";
import type * as SQLite from "expo-sqlite";
import type {
  FloorPlanRoom,
  OpenRestaurantTableInput,
  OpenRestaurantTableOutput,
  PutRestaurantDraftOrderInput,
  PutRestaurantDraftOrderOutput,
  RestaurantModifierGroup,
  RestaurantOrder,
  SendRestaurantOrderToKitchenInput,
  TableSession,
} from "@corely/contracts";
import {
  buildDeterministicIdempotencyKey,
  createPosOutboxCommand,
  PosCommandTypes,
} from "@/offline/posOutbox";
import {
  insertOutboxCommandTransactional,
  readSyncState,
  runInTransaction,
  writeSyncState,
} from "@/lib/pos-db";
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
  RestaurantAggregateRow,
  RestaurantAggregateState,
  RestaurantDraftUpdateInput,
  RestaurantDraftUpdateResult,
  RestaurantOfflineSnapshot,
  RestaurantOpenTableInput as RestaurantLocalOpenTableInput,
  RestaurantOpenTableResult,
  RestaurantSendInput,
  RestaurantSendResult,
} from "@/services/posLocalService.types";

const FLOOR_PLAN_KEY = "restaurant:floor-plan";
const MODIFIER_GROUPS_KEY = "restaurant:modifier-groups";

export async function cacheRestaurantSnapshot(
  db: SQLite.SQLiteDatabase,
  rooms: FloorPlanRoom[],
  modifierGroups: RestaurantModifierGroup[]
): Promise<void> {
  await writeSyncState(db, FLOOR_PLAN_KEY, JSON.stringify(rooms));
  await writeSyncState(db, MODIFIER_GROUPS_KEY, JSON.stringify(modifierGroups));
}

export async function getRestaurantSnapshot(
  db: SQLite.SQLiteDatabase
): Promise<RestaurantOfflineSnapshot> {
  const [roomsRaw, modifierGroupsRaw, aggregates] = await Promise.all([
    readSyncState(db, FLOOR_PLAN_KEY),
    readSyncState(db, MODIFIER_GROUPS_KEY),
    listRestaurantAggregates(db),
  ]);

  const baseRooms = roomsRaw ? (JSON.parse(roomsRaw) as FloorPlanRoom[]) : [];
  const modifierGroups = modifierGroupsRaw
    ? (JSON.parse(modifierGroupsRaw) as RestaurantModifierGroup[])
    : [];

  return {
    rooms: overlayRestaurantFloorPlan(baseRooms, aggregates),
    modifierGroups: cloneModifierGroups(modifierGroups),
  };
}

export async function getRestaurantAggregateByTable(
  db: SQLite.SQLiteDatabase,
  tableId: string
): Promise<RestaurantAggregateState | null> {
  const row = await db.getFirstAsync<RestaurantAggregateRow>(
    `SELECT *
     FROM restaurant_order_aggregates_local
     WHERE table_id = ?
       AND session_status = 'OPEN'
       AND order_status NOT IN ('CLOSED', 'CANCELLED')
     ORDER BY updated_at DESC
     LIMIT 1`,
    [tableId]
  );

  return row ? mapRestaurantAggregateRow(row) : null;
}

export async function upsertRestaurantAggregate(
  db: SQLite.SQLiteDatabase,
  session: TableSession,
  order: RestaurantOrder,
  options?: {
    syncStatus?: RestaurantAggregateState["syncStatus"];
    lastError?: string | null;
  }
): Promise<void> {
  const existing = await getRestaurantAggregateByOrderId(db, order.id);
  const state: RestaurantAggregateState = {
    session: cloneAggregate({
      session,
      order,
      syncStatus: options?.syncStatus ?? existing?.syncStatus ?? "SYNCED",
      lastError: options?.lastError ?? existing?.lastError ?? null,
      commandVersion: existing?.commandVersion ?? 0,
    }).session,
    order: cloneAggregate({
      session,
      order,
      syncStatus: options?.syncStatus ?? existing?.syncStatus ?? "SYNCED",
      lastError: options?.lastError ?? existing?.lastError ?? null,
      commandVersion: existing?.commandVersion ?? 0,
    }).order,
    syncStatus: options?.syncStatus ?? existing?.syncStatus ?? "SYNCED",
    lastError: options?.lastError ?? existing?.lastError ?? null,
    commandVersion: existing?.commandVersion ?? 0,
  };

  await writeRestaurantAggregate(db, state);
}

export async function openRestaurantTableAndEnqueue(
  db: SQLite.SQLiteDatabase,
  input: RestaurantLocalOpenTableInput
): Promise<RestaurantOpenTableResult> {
  const existing = await getRestaurantAggregateByTable(db, input.tableId);
  if (existing) {
    throw new Error("Table already has an active local session");
  }

  const nowIso = new Date().toISOString();
  const tableSessionId = uuidv4();
  const orderId = uuidv4();
  const state = createRestaurantAggregate({
    workspaceId: input.workspaceId,
    tableId: input.tableId,
    registerId: input.registerId,
    shiftSessionId: input.shiftSessionId,
    openedByUserId: input.openedByUserId,
    tableSessionId,
    orderId,
    openedAtIso: nowIso,
  });
  const payload: OpenRestaurantTableInput = {
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
  );

  await runInTransaction(db, async () => {
    await writeRestaurantAggregate(db, state);
    await insertOutboxCommandTransactional(db, command);
  });

  return {
    session: state.session,
    order: state.order,
    command,
  };
}

export async function replaceRestaurantDraftAndEnqueue(
  db: SQLite.SQLiteDatabase,
  input: RestaurantDraftUpdateInput
): Promise<RestaurantDraftUpdateResult> {
  const existing = await requireRestaurantAggregateByOrderId(db, input.orderId);
  const next = replaceRestaurantDraftState(
    existing,
    input.items,
    input.discountCents,
    new Date().toISOString()
  );
  const payload: PutRestaurantDraftOrderInput = {
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
  );

  await runInTransaction(db, async () => {
    await writeRestaurantAggregate(db, next);
    await insertOutboxCommandTransactional(db, command);
  });

  return {
    session: next.session,
    order: next.order,
    command,
  };
}

export async function sendRestaurantOrderAndEnqueue(
  db: SQLite.SQLiteDatabase,
  input: RestaurantSendInput
): Promise<RestaurantSendResult> {
  const existing = await requireRestaurantAggregateByOrderId(db, input.orderId);
  const next = sendRestaurantOrderState(existing, new Date().toISOString());
  const payload: SendRestaurantOrderToKitchenInput = {
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
  );

  await runInTransaction(db, async () => {
    await writeRestaurantAggregate(db, next);
    await insertOutboxCommandTransactional(db, command);
  });

  return {
    session: next.session,
    order: next.order,
    command,
  };
}

export async function markRestaurantOrderSynced(
  db: SQLite.SQLiteDatabase,
  orderId: string,
  next?: {
    session?: TableSession;
    order?: RestaurantOrder;
  }
): Promise<void> {
  const existing = await requireRestaurantAggregateByOrderId(db, orderId);
  const state: RestaurantAggregateState = {
    ...cloneAggregate(existing),
    session: next?.session
      ? cloneAggregate({ ...existing, session: next.session }).session
      : existing.session,
    order: next?.order ? cloneAggregate({ ...existing, order: next.order }).order : existing.order,
    syncStatus: "SYNCED",
    lastError: null,
  };
  await writeRestaurantAggregate(db, state);
}

export async function markRestaurantOrderSyncFailure(
  db: SQLite.SQLiteDatabase,
  orderId: string,
  reason: string
): Promise<void> {
  const existing = await getRestaurantAggregateByOrderId(db, orderId);
  if (!existing) {
    return;
  }
  await writeRestaurantAggregate(db, {
    ...existing,
    syncStatus: "FAILED",
    lastError: reason,
  });
}

async function listRestaurantAggregates(
  db: SQLite.SQLiteDatabase
): Promise<RestaurantAggregateState[]> {
  const rows = await db.getAllAsync<RestaurantAggregateRow>(
    `SELECT * FROM restaurant_order_aggregates_local ORDER BY updated_at DESC`,
    []
  );
  return rows.map(mapRestaurantAggregateRow);
}

async function getRestaurantAggregateByOrderId(
  db: SQLite.SQLiteDatabase,
  orderId: string
): Promise<RestaurantAggregateState | null> {
  const row = await db.getFirstAsync<RestaurantAggregateRow>(
    `SELECT * FROM restaurant_order_aggregates_local WHERE order_id = ?`,
    [orderId]
  );
  return row ? mapRestaurantAggregateRow(row) : null;
}

async function requireRestaurantAggregateByOrderId(
  db: SQLite.SQLiteDatabase,
  orderId: string
): Promise<RestaurantAggregateState> {
  const existing = await getRestaurantAggregateByOrderId(db, orderId);
  if (!existing) {
    throw new Error("Restaurant order not found in local cache");
  }
  return existing;
}

async function writeRestaurantAggregate(
  db: SQLite.SQLiteDatabase,
  state: RestaurantAggregateState
): Promise<void> {
  const createdAt = state.order.createdAt || state.session.createdAt;
  const updatedAt = state.order.updatedAt || state.session.updatedAt;

  await db.runAsync(
    `INSERT INTO restaurant_order_aggregates_local (
      order_id,
      workspace_id,
      table_id,
      table_session_id,
      order_status,
      session_status,
      command_version,
      sync_status,
      last_error,
      session_json,
      order_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      table_id = excluded.table_id,
      table_session_id = excluded.table_session_id,
      order_status = excluded.order_status,
      session_status = excluded.session_status,
      command_version = excluded.command_version,
      sync_status = excluded.sync_status,
      last_error = excluded.last_error,
      session_json = excluded.session_json,
      order_json = excluded.order_json,
      updated_at = excluded.updated_at`,
    [
      state.order.id,
      state.order.workspaceId,
      state.order.tableId,
      state.session.id,
      state.order.status,
      state.session.status,
      state.commandVersion,
      state.syncStatus,
      state.lastError,
      JSON.stringify(state.session),
      JSON.stringify(state.order),
      createdAt,
      updatedAt,
    ]
  );
}

function mapRestaurantAggregateRow(row: RestaurantAggregateRow): RestaurantAggregateState {
  return {
    session: JSON.parse(row.session_json) as TableSession,
    order: JSON.parse(row.order_json) as RestaurantOrder,
    syncStatus: row.sync_status,
    lastError: row.last_error,
    commandVersion: row.command_version,
  };
}
