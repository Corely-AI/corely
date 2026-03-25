# Restaurant POS Pack Phase 1

## Scope

This pack adds restaurant-specific POS behavior on top of Corely's existing modular monolith:

- dining rooms and tables
- table sessions and draft orders
- modifier groups
- kitchen stations and tickets
- table transfer
- send-to-kitchen
- void and discount approval requests
- pay and close with immutable restaurant-side payment snapshots

Phase 1 intentionally does **not** add reservations, delivery integrations, loyalty-specific restaurant flows, or advanced coursing.

## Module shape

The current implementation uses a single additive backend module:

- `services/api/src/modules/restaurant`

It keeps explicit internal seams for:

- floor setup
- ordering
- kitchen
- approvals

This is a pragmatic deviation from the ideal `restaurant-floor` / `restaurant-order` / `kitchen` split because the repo does not yet have stable restaurant-specific cross-module read ports. The data model is additive and the internal seams are designed so the module can be split later without rewriting tables.

## Persistence

Restaurant tables live in the existing `commerce` schema and are tenant/workspace scoped via scalar `tenantId` + `workspaceId` columns. The pack adds:

- `restaurant_dining_rooms`
- `restaurant_tables`
- `restaurant_modifier_groups`
- `restaurant_modifier_options`
- `restaurant_menu_item_modifier_groups`
- `restaurant_table_sessions`
- `restaurant_orders`
- `restaurant_order_items`
- `restaurant_order_item_modifiers`
- `restaurant_order_payments`
- `kitchen_stations`
- `kitchen_tickets`
- `kitchen_ticket_items`
- `restaurant_approval_requests`

## Reused primitives

- register and shift lifecycle: existing `pos` module
- cash reconciliation: existing `cash-management` module
- shared contracts and clients: `@corely/contracts`, `@corely/api-client`
- audit, outbox, idempotency, unit-of-work: `@corely/kernel`, `@corely/data`
- approval workflow execution: existing `approvals` + `workflow` modules
- web app shell and React Query patterns: existing `apps/web` router + `@corely/web-shared`
- POS shell, sync state, register selection, shift screens, catalog snapshot: existing `apps/pos`

## UI surfaces

Web admin/backoffice pages added:

- `/restaurant/floor-plan`
- `/restaurant/modifier-groups`
- `/restaurant/kitchen-stations`
- `/restaurant/kitchen-queue`

POS screens added:

- `/(main)/restaurant`
- `/restaurant/table/:tableId`
- `/restaurant/payment/:orderId`

The POS slice is additive and reuses the same register + shift context as the existing retail POS flow.

## Approval flow

Restaurant approval requests reuse `ApprovalGateService` and workflow-backed approval tasks.

Action keys:

- `restaurant.void`
- `restaurant.discount`

If no approval policy exists for a key, the current approval gate behavior is to auto-approve. To enforce manager approval in production, create active approval policies for these keys.

## Outbox events

The restaurant pack emits additive events only:

- `restaurant.table-opened`
- `restaurant.table-transferred`
- `restaurant.order-draft-updated`
- `restaurant.order-sent-to-kitchen`
- `restaurant.kitchen-ticket-bumped`
- `restaurant.payment-captured`
- `restaurant.table-closed`
- `restaurant.void-requested`
- `restaurant.discount-requested`

## Known repo mismatch

`AGENTS.md` references `.agent/workflows`, but that directory does not exist in the current repo snapshot. No restaurant-specific workflow instructions were available there during implementation.

## Current limitation

The new restaurant POS screens currently call the restaurant API directly with idempotency keys and reuse the shared sync indicators from the app shell, but they do not yet have the same SQLite-backed local draft persistence that the existing retail sale/shift flow already has. The backend architecture is ready for deterministic offline command queuing, but a fuller local restaurant outbox/store layer still needs to be added as a follow-up.
