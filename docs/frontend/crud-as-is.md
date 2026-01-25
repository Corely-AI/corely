# Frontend CRUD — As Is

## Current patterns

- App root: `apps/web` (Vite + React + TS) with global providers (QueryClient, Auth/Workspace, Offline). Routing is centralized in `apps/web/src/app/router/index.tsx`; some modules also expose `routes.tsx` files that are not wired.
- CRUD screens live under `apps/web/src/modules/<module>/screens`. Most list pages are hand-rolled tables inside cards (e.g., expenses, invoices, customers, purchasing/vendor-bills, inventory/products) with per-page query keys such as `["expenses"]` or `["invoices"]`.
- Actions are inline buttons plus dropdown menus per row; primary page action is usually an “Add/Create” button in the page header. Row actions vary (view/edit/delete/duplicate/email) and sometimes navigate on row click (customers).
- Forms use `react-hook-form` + `@hookform/resolvers/zod` in some modules (expenses new/edit, invoices detail/edit, customers edit/create) but are plain uncontrolled inputs elsewhere. Create and edit often share a single screen component (expenses `NewExpensePage`, invoices `InvoiceDetailPage` doubles as edit).
- States: `EmptyState` is used widely; loading is usually a simple text/inline spinner, and error states are largely missing. Bulk selection, bulk actions, and row-level confirm dialogs are absent.
- Data fetching: `@tanstack/react-query` with direct calls to module-specific API clients in `apps/web/src/lib/*.ts`; query invalidation is ad hoc (e.g., invalidating `["expenses"]` after delete) without shared helpers or URL-driven list state.

## Inconsistencies

- Table/list layouts differ per module: some pages are plain tables, some use cards (CRM deals), and detail-first flows (invoices) mix edit + detail in one page rather than an object-page layout.
- Row actions are inconsistent: expenses and invoices use dropdown menus without confirmation; customers rely on row click with no overflow; vendor bills mix status-specific actions in dropdowns with no primary “open” action.
- Routing shape is not uniform: expenses use `/expenses`, `/expenses/new`, `/expenses/:id/edit`; invoices use `/invoices/:id` for detail/edit; CRM/purchasing/inventory use nested paths under domain-specific prefixes.
- Loading/error UX is uneven: some lists gate on `isLoading`, others render empty state when data is undefined; errors are rarely surfaced via toasts.
- Query keys and cache invalidation vary per module; there is no shared query key factory or invalidate helper, and URL state (search/filter/pagination) is not reflected in the UI.

## Risks

- Lack of confirm delete and inconsistent actions can cause accidental destructive operations and user confusion about the primary navigation path (view vs edit).
- Missing loading/error handling leads to silent failures and flicker when switching routes; no bulk-selection patterns make batch operations hard to add.
- Divergent routing makes deep-linking and future redirects harder; changing contracts requires per-module updates.
- Without shared query key/state patterns, cross-page cache invalidation is brittle and pagination/search will diverge across modules.

## Where to standardize with minimal churn

- Introduce a shared CRUD UI kit (layout, row actions, confirm delete, URL-state helper) under `apps/web/src/shared/...` and migrate modules incrementally starting with expenses.
- Normalize routes to `/resource`, `/resource/new`, `/resource/:id`, `/resource/:id/edit` while keeping aliases where needed.
- Establish React Query conventions (query key factory + invalidate helpers) and reuse them in module API hooks.
- Adopt consistent list states (loading/empty/error), toolbar placement, and a single primary row action with overflow for secondary actions; add optional bulk-selection bar for modules that support selection.
