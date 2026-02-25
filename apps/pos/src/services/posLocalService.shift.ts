import { v4 as uuidv4 } from "@lukeed/uuid";
import type * as SQLite from "expo-sqlite";
import type { CloseShiftInput, OpenShiftInput, ShiftSession } from "@corely/contracts";
import {
  buildDeterministicIdempotencyKey,
  createPosOutboxCommand,
  PosCommandTypes,
  type ShiftCashEventCommandPayload,
  type ShiftCashEventType,
} from "@/offline/posOutbox";
import { insertOutboxCommandTransactional, runInTransaction } from "@/lib/pos-db";
import { mapShift, mapShiftCashEvent } from "@/services/posLocalService.mappers";
import type {
  ShiftCashEventInput,
  ShiftCashEventRecord,
  ShiftCashEventRow,
  ShiftCashEventTotals,
  ShiftCloseInput,
  ShiftOpenInput,
  ShiftSessionCloseInputRow,
  ShiftSessionRow,
} from "@/services/posLocalService.types";

export async function getCurrentOpenShift(
  db: SQLite.SQLiteDatabase,
  registerId: string
): Promise<ShiftSession | null> {
  const row = await db.getFirstAsync<ShiftSessionRow>(
    `SELECT *
     FROM shift_sessions_local
     WHERE register_id = ? AND status = 'OPEN'
     ORDER BY opened_at DESC
     LIMIT 1`,
    [registerId]
  );

  if (!row) {
    return null;
  }

  return mapShift(row);
}

export async function upsertShiftSession(
  db: SQLite.SQLiteDatabase,
  session: ShiftSession
): Promise<void> {
  await db.runAsync(
    `INSERT INTO shift_sessions_local (
      session_id,
      workspace_id,
      register_id,
      opened_by_employee_party_id,
      opened_at,
      starting_cash_cents,
      status,
      closed_at,
      closed_by_employee_party_id,
      closing_cash_cents,
      total_sales_cents,
      total_cash_received_cents,
      variance_cents,
      notes,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      register_id = excluded.register_id,
      opened_by_employee_party_id = excluded.opened_by_employee_party_id,
      opened_at = excluded.opened_at,
      starting_cash_cents = excluded.starting_cash_cents,
      status = excluded.status,
      closed_at = excluded.closed_at,
      closed_by_employee_party_id = excluded.closed_by_employee_party_id,
      closing_cash_cents = excluded.closing_cash_cents,
      total_sales_cents = excluded.total_sales_cents,
      total_cash_received_cents = excluded.total_cash_received_cents,
      variance_cents = excluded.variance_cents,
      notes = excluded.notes,
      updated_at = excluded.updated_at`,
    [
      session.sessionId,
      session.workspaceId,
      session.registerId,
      session.openedByEmployeePartyId,
      session.openedAt.toISOString(),
      session.startingCashCents,
      session.status,
      session.closedAt?.toISOString() ?? null,
      session.closedByEmployeePartyId,
      session.closingCashCents,
      session.totalSalesCents,
      session.totalCashReceivedCents,
      session.varianceCents,
      session.notes,
      session.createdAt.toISOString(),
      session.updatedAt.toISOString(),
    ]
  );
}

export async function openShiftAndEnqueue(
  db: SQLite.SQLiteDatabase,
  input: ShiftOpenInput
): Promise<ShiftSession> {
  const now = new Date();
  const sessionId = uuidv4();

  const payload: OpenShiftInput = {
    sessionId,
    registerId: input.registerId,
    openedByEmployeePartyId: input.openedByEmployeePartyId,
    startingCashCents: input.startingCashCents,
    notes: input.notes,
  };

  const command = createPosOutboxCommand(
    input.workspaceId,
    PosCommandTypes.ShiftOpen,
    payload,
    buildDeterministicIdempotencyKey.shiftOpen(sessionId)
  );

  await runInTransaction(db, async () => {
    await db.runAsync(
      `INSERT INTO shift_sessions_local (
        session_id,
        workspace_id,
        register_id,
        opened_by_employee_party_id,
        opened_at,
        starting_cash_cents,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        input.workspaceId,
        input.registerId,
        input.openedByEmployeePartyId,
        now.toISOString(),
        input.startingCashCents,
        "OPEN",
        input.notes ?? null,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    await insertOutboxCommandTransactional(db, command);
  });

  const session = await getCurrentOpenShift(db, input.registerId);
  if (!session) {
    throw new Error("Shift was created locally but could not be reloaded");
  }

  return session;
}

export async function closeShiftAndEnqueue(
  db: SQLite.SQLiteDatabase,
  input: ShiftCloseInput
): Promise<ShiftSession> {
  const session = await db.getFirstAsync<ShiftSessionCloseInputRow>(
    `SELECT * FROM shift_sessions_local WHERE session_id = ?`,
    [input.sessionId]
  );

  if (!session) {
    throw new Error("Shift session not found");
  }
  if (session.status !== "OPEN") {
    throw new Error("Shift session is already closed");
  }

  const totals = await getShiftCashEventTotals(db, input.sessionId);
  const expectedCashCents =
    (session.starting_cash_cents ?? 0) +
    session.total_cash_received_cents +
    totals.paidInCents -
    totals.paidOutCents;
  const varianceCents =
    input.closingCashCents === null ? null : input.closingCashCents - expectedCashCents;

  const payload: CloseShiftInput = {
    sessionId: input.sessionId,
    closingCashCents: input.closingCashCents,
    notes: input.notes,
  };

  const command = createPosOutboxCommand(
    input.workspaceId,
    PosCommandTypes.ShiftClose,
    payload,
    buildDeterministicIdempotencyKey.shiftClose(input.sessionId)
  );

  await runInTransaction(db, async () => {
    await db.runAsync(
      `UPDATE shift_sessions_local
       SET status = 'CLOSED',
           closed_at = ?,
           closed_by_employee_party_id = ?,
           closing_cash_cents = ?,
           variance_cents = ?,
           notes = ?,
           updated_at = ?
       WHERE session_id = ?`,
      [
        new Date().toISOString(),
        input.closedByEmployeePartyId,
        input.closingCashCents,
        varianceCents,
        input.notes ?? session.notes,
        new Date().toISOString(),
        input.sessionId,
      ]
    );
    await insertOutboxCommandTransactional(db, command);
  });

  const closed = await db.getFirstAsync<ShiftSessionRow>(
    `SELECT * FROM shift_sessions_local WHERE session_id = ?`,
    [input.sessionId]
  );

  if (!closed) {
    throw new Error("Closed shift could not be reloaded");
  }

  return mapShift(closed);
}

export async function createShiftCashEventAndEnqueue(
  db: SQLite.SQLiteDatabase,
  input: ShiftCashEventInput
): Promise<void> {
  if (input.amountCents <= 0) {
    throw new Error("Cash event amount must be positive");
  }

  const occurredAt = new Date();
  const eventId = uuidv4();
  const payload: ShiftCashEventCommandPayload = {
    eventId,
    sessionId: input.sessionId,
    registerId: input.registerId,
    eventType: input.eventType,
    amountCents: input.amountCents,
    reason: input.reason,
    occurredAt: occurredAt.toISOString(),
  };

  const command = createPosOutboxCommand(
    input.workspaceId,
    PosCommandTypes.ShiftCashEvent,
    payload,
    buildDeterministicIdempotencyKey.shiftCashEvent(eventId)
  );

  await runInTransaction(db, async () => {
    await db.runAsync(
      `INSERT INTO shift_cash_events_local (
        event_id,
        session_id,
        workspace_id,
        register_id,
        event_type,
        amount_cents,
        reason,
        created_by_employee_party_id,
        occurred_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        eventId,
        input.sessionId,
        input.workspaceId,
        input.registerId,
        input.eventType,
        input.amountCents,
        input.reason,
        input.createdByEmployeePartyId,
        occurredAt.toISOString(),
      ]
    );

    await insertOutboxCommandTransactional(db, command);
  });
}

export async function markShiftCashEventSynced(
  db: SQLite.SQLiteDatabase,
  eventId: string
): Promise<void> {
  await db.runAsync(
    `UPDATE shift_cash_events_local
     SET sync_status = 'SYNCED',
         last_error = NULL
     WHERE event_id = ?`,
    [eventId]
  );
}

export async function markShiftCashEventFailed(
  db: SQLite.SQLiteDatabase,
  eventId: string,
  error: string
): Promise<void> {
  await db.runAsync(
    `UPDATE shift_cash_events_local
     SET sync_status = 'FAILED',
         last_error = ?
     WHERE event_id = ?`,
    [error, eventId]
  );
}

export async function getShiftCashEventTotals(
  db: SQLite.SQLiteDatabase,
  sessionId: string
): Promise<ShiftCashEventTotals> {
  const rows = await db.getAllAsync<Pick<ShiftCashEventRow, "event_type" | "amount_cents">>(
    `SELECT event_type, amount_cents
     FROM shift_cash_events_local
     WHERE session_id = ?`,
    [sessionId]
  );

  return rows.reduce<ShiftCashEventTotals>(
    (acc, row) => {
      if (row.event_type === "PAID_IN") {
        acc.paidInCents += row.amount_cents;
      } else {
        acc.paidOutCents += row.amount_cents;
      }
      return acc;
    },
    { paidInCents: 0, paidOutCents: 0 }
  );
}

export async function listShiftCashEvents(
  db: SQLite.SQLiteDatabase,
  sessionId: string
): Promise<ShiftCashEventRecord[]> {
  const rows = await db.getAllAsync<ShiftCashEventRow>(
    `SELECT *
     FROM shift_cash_events_local
     WHERE session_id = ?
     ORDER BY occurred_at DESC`,
    [sessionId]
  );

  return rows.map(mapShiftCashEvent);
}

export type { ShiftCashEventType };
