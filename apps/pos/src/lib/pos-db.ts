import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import type { OutboxCommand } from "@corely/offline-core";

const DB_NAME = "corely-pos.db";

let initialized = false;
let dbInstancePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let schemaInitPromise: Promise<void> | null = null;

export async function getPosDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstancePromise) {
    dbInstancePromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  const db = await dbInstancePromise;

  if (!initialized) {
    if (!schemaInitPromise) {
      schemaInitPromise = initializePosSchema(db)
        .then(() => {
          initialized = true;
        })
        .catch((error) => {
          schemaInitPromise = null;
          throw error;
        });
    }
    await schemaInitPromise;
  }
  return db;
}

export async function runInTransaction<T>(
  db: SQLite.SQLiteDatabase,
  operation: () => Promise<T>
): Promise<T> {
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION");
  try {
    const result = await operation();
    await db.execAsync("COMMIT");
    return result;
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

export async function insertOutboxCommandTransactional(
  db: SQLite.SQLiteDatabase,
  command: OutboxCommand
): Promise<void> {
  await db.runAsync(
    `INSERT INTO outbox_commands (
      commandId,
      workspaceId,
      type,
      payload,
      createdAt,
      status,
      attempts,
      nextAttemptAt,
      idempotencyKey,
      clientTraceId,
      meta,
      errorMessage,
      errorCode,
      errorRetryable,
      errorMeta,
      conflict
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      command.commandId,
      command.workspaceId,
      command.type,
      JSON.stringify(command.payload),
      command.createdAt.toISOString(),
      command.status,
      command.attempts,
      command.nextAttemptAt?.toISOString() ?? null,
      command.idempotencyKey,
      command.clientTraceId ?? null,
      command.meta ? JSON.stringify(command.meta) : null,
      command.error?.message ?? null,
      command.error?.code ?? null,
      command.error?.retryable ? 1 : 0,
      command.error?.meta ? JSON.stringify(command.error.meta) : null,
      command.conflict ? JSON.stringify(command.conflict) : null,
    ]
  );
}

export async function writeSyncState(
  db: SQLite.SQLiteDatabase,
  key: string,
  value: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_state (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [key, value, nowIso]
  );
}

export async function readSyncState(
  db: SQLite.SQLiteDatabase,
  key: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_state WHERE key = ?`,
    [key]
  );
  return row?.value ?? null;
}

export async function appendSyncLog(
  db: SQLite.SQLiteDatabase,
  entry: {
    workspaceId: string | null;
    level: "INFO" | "WARN" | "ERROR";
    message: string;
    meta?: unknown;
  }
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_logs (
      log_id,
      workspace_id,
      level,
      message,
      meta_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      entry.workspaceId,
      entry.level,
      entry.message,
      entry.meta ? JSON.stringify(entry.meta) : null,
      new Date().toISOString(),
    ]
  );
}

export async function exportSyncLogs(
  db: SQLite.SQLiteDatabase,
  workspaceId: string | null
): Promise<string> {
  const rows = workspaceId
    ? await db.getAllAsync<{
        log_id: string;
        workspace_id: string | null;
        level: string;
        message: string;
        meta_json: string | null;
        created_at: string;
      }>(
        `SELECT * FROM sync_logs
         WHERE workspace_id = ?
         ORDER BY created_at DESC`,
        [workspaceId]
      )
    : await db.getAllAsync<{
        log_id: string;
        workspace_id: string | null;
        level: string;
        message: string;
        meta_json: string | null;
        created_at: string;
      }>(
        `SELECT * FROM sync_logs
         ORDER BY created_at DESC`,
        []
      );

  return JSON.stringify(
    rows.map((row) => ({
      id: row.log_id,
      workspaceId: row.workspace_id,
      level: row.level,
      message: row.message,
      meta: row.meta_json ? JSON.parse(row.meta_json) : null,
      createdAt: row.created_at,
    })),
    null,
    2
  );
}

async function initializePosSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  const statements = [
    Platform.OS !== "web" ? "PRAGMA journal_mode = WAL" : null,
    "PRAGMA foreign_keys = ON",
    `CREATE TABLE IF NOT EXISTS catalog_products (
      product_id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      barcode TEXT,
      price_cents INTEGER NOT NULL,
      taxable INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      estimated_qty INTEGER,
      category TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`,
    "CREATE INDEX IF NOT EXISTS idx_catalog_products_name ON catalog_products(name)",
    "CREATE INDEX IF NOT EXISTS idx_catalog_products_sku ON catalog_products(sku)",
    "CREATE INDEX IF NOT EXISTS idx_catalog_products_barcode ON catalog_products(barcode)",
    `CREATE TABLE IF NOT EXISTS pos_sales (
      pos_sale_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      session_id TEXT,
      register_id TEXT NOT NULL,
      sale_date TEXT NOT NULL,
      cashier_employee_party_id TEXT NOT NULL,
      customer_party_id TEXT,
      receipt_number TEXT NOT NULL,
      cart_discount_cents INTEGER NOT NULL DEFAULT 0,
      subtotal_cents INTEGER NOT NULL,
      tax_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_SYNC',
      idempotency_key TEXT NOT NULL UNIQUE,
      server_invoice_id TEXT,
      server_payment_id TEXT,
      sync_error TEXT,
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      hardware_artifact_json TEXT,
      local_created_at TEXT NOT NULL,
      synced_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pos_sales_workspace_status
      ON pos_sales(workspace_id, status, local_created_at)`,
    `CREATE TABLE IF NOT EXISTS pos_sale_line_items (
      line_item_id TEXT PRIMARY KEY,
      pos_sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      line_total_cents INTEGER NOT NULL,
      FOREIGN KEY (pos_sale_id) REFERENCES pos_sales(pos_sale_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS pos_sale_payments (
      payment_id TEXT PRIMARY KEY,
      pos_sale_id TEXT NOT NULL,
      method TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      reference TEXT,
      FOREIGN KEY (pos_sale_id) REFERENCES pos_sales(pos_sale_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS shift_sessions_local (
      session_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      register_id TEXT NOT NULL,
      opened_by_employee_party_id TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      starting_cash_cents INTEGER,
      status TEXT NOT NULL,
      closed_at TEXT,
      closed_by_employee_party_id TEXT,
      closing_cash_cents INTEGER,
      total_sales_cents INTEGER NOT NULL DEFAULT 0,
      total_cash_received_cents INTEGER NOT NULL DEFAULT 0,
      variance_cents INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shift_sessions_local_register_status
      ON shift_sessions_local(register_id, status, opened_at)`,
    `CREATE TABLE IF NOT EXISTS shift_cash_events_local (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      register_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      reason TEXT,
      created_by_employee_party_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      last_error TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shift_cash_events_local_session
      ON shift_cash_events_local(session_id, occurred_at)`,
    `CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sync_logs (
      log_id TEXT PRIMARY KEY,
      workspace_id TEXT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      meta_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS outbox_commands (
      commandId TEXT PRIMARY KEY,
      workspaceId TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      nextAttemptAt TEXT,
      idempotencyKey TEXT NOT NULL,
      clientTraceId TEXT,
      meta TEXT,
      errorMessage TEXT,
      errorCode TEXT,
      errorRetryable INTEGER,
      errorMeta TEXT,
      conflict TEXT
    )`,
    "CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_commands(workspaceId, status, nextAttemptAt)",
    "CREATE INDEX IF NOT EXISTS idx_outbox_idempotency ON outbox_commands(workspaceId, idempotencyKey)",
  ];

  for (const statement of statements) {
    if (!statement) {
      continue;
    }
    await db.execAsync(`${statement};`);
  }
}
