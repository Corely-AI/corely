# Frontend CRUD and Operational Entry-Point Standard

## Operational entry points (target guidance, 2026-11-07)

The [focused package](../products/corely/launch-plan.md) proposes Schedule, Team,
and Daily Work. Choose entry points for the user’s job: calendars for availability,
task boards/checklists for work, decision inboxes for approvals, daily views for
coordination and employee self-service for permitted personal actions. These are
suitable target patterns, not a claim that all screens already exist.

Keep the list/detail CRUD conventions below for record browsing/editing; do not
force every operational experience into a table. Preserve routes unless a separate
change authorizes them. Provide loading/empty/error states, accessible keyboard/
mobile interaction, current-source/freshness signals and safe action confirmation.
Private personnel reasons must not appear in general operational views.

Reuse public exports from `@corely/ui`, `@corely/web-shared`, and
`@corely/web-features`; never fork a focused package or import another app’s
private screens. Frontend visibility is not backend authorization. AI suggestions
remain proposals until validated/revalidated and approved as required by
[AI policy](../ai/ai-copilot.md).

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

- **Loading**: Use a layout-matched skeleton for the initial load of every data-backed screen or section.
- **Empty**: `EmptyState` with icon, title, description, and primary action.
- **Error**: Inline error state with retry and toast; React Query error should not render empty silently.

### Skeleton loading for new features

- Import `LoadingSkeleton`, `TableLoadingSkeleton`, or the primitive `Skeleton` from `@corely/ui`. Use `PageLoadingSkeleton` from `@corely/web-shared/shared/components/page-loading-skeleton` when a whole route is waiting for its first content.
- Keep the page heading, filters, navigation, and any usable content in place. Fill the waiting region with placeholders sized like its loaded rows, cards, fields, calendar cells, or messages. Use `TableLoadingSkeleton` inside a table body to keep the real headers and column alignment.
- Tie the skeleton to the initial load for the current query key, including workspace and record identity where applicable. Preserve authorized cached content during background refetches. A disabled query, an empty result, a permission denial, and a load error each follow their own state.
- Use the existing localized loading label. Each loading region provides one status to assistive technology. Shared skeletons are decorative and respect reduced motion. For a custom layout, put a localized `role="status"` label outside its `aria-hidden` placeholders.
- Keep submit, upload, and similar action feedback on the affected control. A synchronous screen can render immediately.
- Review the first load with a delayed response on desktop and mobile. Check reduced motion, keyboard access to controls outside the loading region, and the transition to content, empty, and error states.

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
- [ ] Verify a layout-matched initial skeleton, accessible loading status, and distinct empty and error states.
- [ ] Reuse shared forms between create/edit; navigate consistently after save (detail or list) and invalidate caches.
