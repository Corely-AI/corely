# Offline-first Frontend Foundation (Web now, React Native POS later)

## Summary

Build an **offline-first data layer** that is **reusable across multiple clients** (Vite web app now, React Native POS later).  
Core idea: keep offline logic **platform-agnostic** in shared TypeScript packages, and implement thin **platform adapters** for storage/network/background triggers.

This scales to a full ERP **if offline support is rolled out module-by-module** (not “everything offline on day 1”).

---

## Goals

- **Offline app experience**
  - App loads reliably (web shell)
  - Previously viewed data available offline (offline read)
  - Key actions can be performed offline and synced later (offline write)
- **Cross-client reuse**
  - Same offline queue + sync engine used by web and future RN POS
- **ERP-ready**
  - Workspace-scoped isolation, idempotency, conflict handling, versioning

---

## Non-goals (v1)

- Full offline replication of all ERP modules and all datasets
- File attachments offline upload (handle separately)
- Multi-legal-entity per workspace (v1 model remains 1:1)

---

## Core Concepts

### Workspace scoping

- **workspace = tenant** (single isolation boundary)
- All cached data and queued commands must be partitioned by `workspaceId`.

### Offline Read (Cache Persistence)

- Persist query results locally (recommended: IndexedDB on web).
- Use stale-while-revalidate: show cached data instantly, refresh when online.

### Offline Write (Client Outbox)

- Mutations become **Commands**:
  - Save command locally (outbox)
  - Apply optimistic UI immediately
  - Sync engine flushes commands when back online

### Sync Engine

- Flush outbox commands with:
  - retry + exponential backoff
  - idempotency keys (no duplicates)
  - conflict detection and UI surfacing
  - workspace-level locking (avoid double flush in multiple tabs)

---

## Architecture Overview

### Shared packages (platform-agnostic)

- `packages/offline-core`
  - command model + registry
  - outbox store interface (port)
  - sync engine (retry, backoff, lock)
  - transport interface (port)
  - network monitor interface (port)
  - conflict types

### Platform packages (adapters)

- `packages/offline-web`
  - IndexedDB OutboxStore implementation
  - Web cross-tab lock (TTL lock)
  - Web NetworkMonitor (`navigator.onLine` events)
  - TanStack Query persister (IndexedDB preferred)
  - Optional PWA shell caching (service worker)
- `packages/offline-rn` (skeleton initially)
  - NetworkMonitor via NetInfo
  - OutboxStore planned on SQLite (recommended for POS volume)
  - Later: background sync hooks

### Apps

- Web app integrates:
  - offline providers + outbox + sync engine + UI states
- RN POS later integrates the same `offline-core` with RN adapters.

---

## Data & Command Model

### OutboxCommand (minimum fields)

- `commandId` (client-generated UUID/ULID)
- `workspaceId`
- `type` (e.g., `EXPENSE_CREATE_V1`)
- `payload` (typed)
- `status`: `PENDING | IN_FLIGHT | SUCCEEDED | FAILED | CONFLICT`
- `attempts`, `nextAttemptAt`
- `idempotencyKey` (required)
- `createdAt`
- optional `clientTraceId`

### Client-generated IDs

- Prefer client-generated stable IDs for new records (e.g., expenseId) to avoid remapping.

### Version every command type

- Use suffix `_V1`, `_V2`, etc.
- Keep backward compatibility in server handling.

---

## Backend Requirements (must-have for correctness)

### Idempotency

All endpoints that can be called from outbox must support:

- `Idempotency-Key` header
- de-dup by `(workspaceId, userId, idempotencyKey)`
- return same response/no-op for retries

### Conflict handling (recommended)

For updates:

- use optimistic concurrency (`expectedVersion` / ETag)
- return `409 CONFLICT` with current server snapshot/version

### Sync endpoint (recommended for future growth)

Add a generic endpoint:

- `POST /sync/commands` to accept a batch and return per-command results  
  This makes multi-client support (web + RN) cleaner and more observable.

---

## Web-specific Notes

### Optional PWA shell

- Cache build assets so the app loads offline.
- Keep PWA logic inside `offline-web` / `apps/web` only.

### Storage

- IndexedDB for outbox + persisted query cache (preferred).

### Cross-tab safety

- TTL lock to prevent multiple tabs flushing the outbox simultaneously.

---

## React Native POS Plan (future)

- Reuse `packages/offline-core` without changes.
- Implement `offline-rn` adapters:
  - Storage: SQLite (recommended for POS)
  - Network: NetInfo
  - Later: background tasks / push-triggered sync
- UI: show “pending sync” statuses and allow conflict resolution where needed.

---

## UX Requirements (v1)

- Global OFFLINE banner
- Per-record sync status:
  - Pending / Synced / Conflict / Failed
- Conflict screen:
  - show local vs server version
  - allow “retry with latest” or “discard local”
- “Sync now” manual trigger and sync progress indicator

---

## Security & Compliance

- Offline means storing business data on-device.
- Partition storage per `workspaceId` and user.
- On logout:
  - clear workspace-scoped caches and outbox (or enforce explicit “remember me” policy)
- Avoid persisting highly sensitive datasets by default (configurable allowlist).

---

## Observability

- Add `clientTraceId` to commands
- Log sync events:
  - flush start/finish, retries, conflicts, failures
- Backend logs should include:
  - workspaceId, userId, idempotencyKey, commandId, correlation IDs

---

## Testing Strategy

### Unit tests (offline-core)

- flush success path
- retry/backoff scheduling
- conflict state handling
- lock acquire/release behavior (fake lock)

### Adapter tests (offline-web)

- IndexedDB outbox CRUD + indexed queries
- lock TTL behavior

### Integration test (web)

- enqueue mutation while offline → UI shows pending
- go online → outbox flushes → UI shows synced
- simulate conflict → UI shows conflict state

---

## Delivery Plan (Recommended Milestones)

### Milestone 1: Offline read + shell

- PWA shell (optional)
- Persist query cache (workspace-scoped)
- Offline banner + cached views

### Milestone 2: Client outbox for 1–2 modules

- Commands: `EXPENSE_CREATE_V1`, `INVOICE_DRAFT_CREATE_V1`
- Sync engine + idempotency keys
- Basic “pending/synced” UX

### Milestone 3: Conflicts + batch sync endpoint

- `POST /sync/commands`
- 409 conflict UX flow
- Better telemetry/observability

### Milestone 4: RN POS readiness

- `offline-rn` adapters (NetInfo + SQLite)
- POS-specific offline flows (orders, payments, inventory deltas)

---

## Future Work (ERP-scale)

- Selective offline “pin datasets” (catalog, customers, price lists)
- Attachments pipeline (metadata in outbox, upload when online)
- Domain-specific conflict strategies:
  - last-write-wins for settings
  - append-only for ledger postings
  - conflict resolution for inventory counts
- Local DB migrations (SQLite schema versioning for RN)
- Organization-level grouping (optional) without breaking workspace isolation
