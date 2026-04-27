# POS Admin Transactions

## Problem statement

POS Admin exposed register setup but gave operators no read path to inspect synced POS sales from the web admin.

## Current gap discovered

- The POS module already synced sales into accounting/cash workflows.
- POS sale sync now persists a `commerce.pos_sale_records` read model.
- POS Admin navigation and web feature registration still only exposed `Registers`.
- There was no web route, API client, or list/detail screen for viewing synced transactions.

## Chosen design

- Keep operator-facing language as `Transactions` in POS Admin.
- Reuse the existing POS module read model based on persisted `PosSaleRecord`.
- Keep Phase 1 read-only.
- Follow the existing feature registration and CRUD-style list/detail UI patterns already used in the monorepo.

## Backend endpoints and use cases added

- Reused existing POS read use cases:
  - `ListPosTransactionsUseCase`
  - `GetPosTransactionUseCase`
- Reused existing controller endpoints:
  - `GET /pos/admin/transactions`
  - `GET /pos/admin/transactions/:transactionId`
- Added tests for:
  - list use case mapping/page info
  - get use case detail/not-found behavior
  - API permission enforcement
  - API workspace scoping and filter behavior

## Web routes and screens added

- Added POS Admin routes:
  - `/pos/admin/transactions`
  - `/pos/admin/transactions/:transactionId`
- Added screens:
  - transactions list with search, register filter, status filter, date range, and pagination
  - read-only transaction detail with totals, sync metadata, payments, and line items

## Manifest and menu changes

- POS manifest now contributes:
  - `Transactions`
- The menu item points to `/pos/admin/transactions`
- It is scoped to the POS web surface and gated by `pos.transactions.read`

## Permissions applied

- Backend endpoint protection uses `@RequirePermission("pos.transactions.read")`
- Web routes use `RequirePermission("pos.transactions.read")`
- Existing compatibility aliasing already maps `cash.read` to `pos.transactions.read`
- Demo restaurant seed already includes `pos.transactions.read`

## Tests added

- `services/api/src/modules/pos/application/use-cases/list-pos-transactions.usecase.test.ts`
- `services/api/src/modules/pos/application/use-cases/get-pos-transaction.usecase.test.ts`
- `services/api/src/modules/pos/__tests__/pos-transactions-api.int.test.ts`
- `services/api/src/modules/pos/pos.manifest.spec.ts`
- `packages/web-features/src/modules/pos-transactions/screens/PosTransactionsScreen.spec.tsx`
- `packages/web-features/src/modules/pos-transactions/screens/pos-transaction-routes.spec.tsx`

## Known gaps and follow-ups

- Transaction detail currently shows raw cashier/customer IDs because POS sync does not yet resolve richer party display data into the read model.
- There is no refund, void, export, or reconciliation workflow in Phase 1.
- Transaction status is currently constrained by the persisted POS sync state and does not yet expose downstream accounting lifecycle states.
