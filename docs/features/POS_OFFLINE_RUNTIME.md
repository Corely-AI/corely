# POS Offline Runtime (apps/pos)

This document describes the productionized offline runtime in `apps/pos`.

## Architecture alignment

- Client consumes only HTTP APIs and shared contracts from `@corely/contracts`.
- Business invariants remain server-side; POS client records local intent + sync command.
- No backend internals are imported into the app.

## Local persistence

SQLite schema is initialized in `apps/pos/src/lib/pos-db.ts`.

Core tables:

- `catalog_products`
- `pos_sales`, `pos_sale_line_items`, `pos_sale_payments`
- `shift_sessions_local`, `shift_cash_events_local`
- `outbox_commands`
- `sync_state`, `sync_logs`

## Transactional write rules

Critical mutation paths (sale finalize / shift open-close / cash event) use:

1. Local domain write(s)
2. Outbox command insert

inside one SQLite transaction.

Implementation lives in:

- `apps/pos/src/services/posLocalService.ts`
- `apps/pos/src/offline/posOutbox.ts`

## Command types + idempotency

- `pos.sale.finalize` -> `sale:<saleId>:finalize:v1`
- `pos.shift.open` -> `shift:<sessionId>:open:v1`
- `pos.shift.close` -> `shift:<sessionId>:close:v1`
- `pos.shift.cash-event` -> `shift-cash:<eventId>:v1`

Retries are safe and deterministic by key.

## Sync engine behavior

Hook: `apps/pos/src/hooks/useSyncEngine.ts`
Transport: `apps/pos/src/lib/offline/posSyncTransport.ts`

Behavior:

- Tracks workspace outbox queue
- Pushes pending commands when online or on manual trigger
- Uses `RETRYABLE_ERROR` backoff, explicit `CONFLICT`, explicit `FAILED`
- Exposes dashboard actions:
  - sync now
  - retry failed
  - retry single command
  - drop command (admin-confirmed)
  - export sync logs

## Conflict handling

- Conflicts are surfaced with command-level status `CONFLICT`
- No silent merge paths
- Payload + error context is inspectable in Sync screen

## Shift/register flow

- Shift open is local-first + outbox
- Paid in/out events are local-first + outbox
- Shift close calculates expected cash:
  - `startingCash + cashFromSales + paidIn - paidOut`
- Variance is persisted locally and shown before close confirmation

## Hardware integration

Package: `packages/pos-hardware`

- Vendor-neutral interfaces:
  - `HardwareManager`
  - `TseService`
- Providers:
  - Mock (default fallback)
  - Native provider bridge (`CorelyPosHardware`)
- Android Kotlin scaffold:
  - `packages/pos-hardware/android/src/main/java/com/corely/poshardware/CorelyPosHardwareModule.kt`

Checkout integration:

- Hardware call is optional/required via env flags.
- If required and hardware fails, finalize is blocked.
- If optional and hardware fails, sale continues with warning artifact.
