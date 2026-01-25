# Frontend CRUD UI Standard (ERP Floorplans)

## Floorplans

- **List Report (table-first CRUD)**: Primary entry for browsing, search/filter, bulk actions, and quick row actions. Shows toolbar, filters, table, empty/loading/error states.
- **Object Page (detail-first CRUD)**: Detail view with header (title/status/meta, primary actions) and sectioned content (overview/form, attachments, activity/audit). Edit may be inline or via `/edit`.

## Routes (per resource)

- `/resource` → List Report
- `/resource/new` → Create
- `/resource/:id` → Object Page (read/detail)
- `/resource/:id/edit` → Edit (reuse form)
- Keep legacy aliases for compatibility when reshaping routes.

## Action placement

- **Page header**: Title + primary call-to-action (e.g., “Add expense”) and optional secondary actions.
- **Toolbar (below header)**: Filters/search, secondary/bulk actions, view toggles.
- **Row actions**: Use `CrudRowActions` with one visible primary action (“Open”/“View”) and overflow menu for secondary actions (Edit/Duplicate/Delete/etc.). Disable unavailable actions with tooltips when possible.
- **Bulk actions**: Bulk bar appears only when rows are selected; place destructive bulk delete here and always confirm.
- **Delete**: Always uses `ConfirmDeleteDialog` (busy state while mutation runs).

## Required states

- **Loading**: Skeletons or table loading placeholder; avoid empty flashes.
- **Empty**: `EmptyState` with icon, title, description, and primary action.
- **Error**: Inline error state with retry and toast; React Query error should not render empty silently.

## URL/search state (list pages)

- Query params: `q`, `page`, `pageSize`, `sort`, `filters` (JSON or repeated keys).
- `useCrudUrlState` syncs table state to URL (debounced for search); fall back to in-memory state if URL is not desired.

## React Query conventions

- **Query keys**: `["<resource>", "list", params]`, `["<resource>", id]`, `["<resource>", "options"]` etc. Export via `createCrudQueryKeys(resource)`.
- **Mutations**: Invalidate affected queries using `invalidateResourceQueries(queryClient, resource)` (list + detail).
- **Suspense/Enabled**: Use `enabled` to guard detail queries on presence of `id`.
- **Error handling**: Surface errors via toast + inline message; propagate ProblemDetails detail/title when available.

## Shared CRUD kit (required pieces)

- `CrudListPageLayout`: Header (title/subtitle/actions), toolbar slot, filters/search slot, table slot; consistent spacing and responsive layout.
- `CrudRowActions`: Primary action + overflow menu for edit/duplicate/delete; accepts callbacks/links and disabled states.
- `ConfirmDeleteDialog`: Standard destructive confirmation with busy state and customizable copy.
- `useCrudUrlState` (optional): Hook to map search/filter/page/sort ↔ URL query params.
- React Query helpers: `createCrudQueryKeys(resourceName)`, `invalidateResourceQueries(queryClient, resourceName)` to centralize cache keys.

## Migration checklist (per module)

- [ ] Align routes to `/resource`, `/resource/new`, `/resource/:id`, `/resource/:id/edit` (add redirects if needed).
- [ ] Replace ad-hoc page scaffolding with `CrudListPageLayout`; move primary CTA to header actions.
- [ ] Swap row action dropdowns for `CrudRowActions`; ensure only one visible primary action.
- [ ] Add `ConfirmDeleteDialog` for destructive actions; surface errors via toast.
- [ ] Wire list state to URL via `useCrudUrlState` (or consistent local state) and use shared query keys + invalidation helpers.
- [ ] Ensure loading/empty/error states are present and consistent.
- [ ] Reuse shared forms between create/edit; navigate consistently after save (detail or list) and invalidate caches.
