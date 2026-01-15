# Frontend CRUD Module Template (How-to)

Use this checklist to create or migrate a module to the CRUD floorplans.

## Setup

- [ ] Create module folder under `apps/web/src/modules/<resource>/`.
- [ ] Add route entries in `apps/web/src/app/router/index.tsx` (or module `routes.tsx` if re-exported): `/resource`, `/resource/new`, `/resource/:id`, `/resource/:id/edit` (with legacy redirects if needed).
- [ ] Create API client in `apps/web/src/lib/<resource>-api.ts` with `list/get/create/update/delete` using `apiClient` and shared query key helpers from `shared/crud/query-keys`.

## List Report (`/resource`)

- [ ] Build page with `CrudListPageLayout` (header/title/primary action, toolbar slots).
- [ ] Use `useCrudUrlState` for `q/page/pageSize/sort/filters`; pass state to list query.
- [ ] Fetch data with React Query using `createCrudQueryKeys("<resource>")`.
- [ ] Render table/grid; plug row actions through `CrudRowActions` (primary “Open/View”, overflow for edit/duplicate/delete).
- [ ] Add bulk selection (if supported) and show bulk bar only when selection exists.
- [ ] Use `EmptyState` for empty results, skeletons for loading, inline error with retry for failures.
- [ ] Delete/bulk delete uses `ConfirmDeleteDialog` and invalidates list/detail queries on success.

## Object Page (`/resource/:id`)

- [ ] Header: title + status chips + key metadata; primary actions (Edit/Delete) aligned right; delete confirms.
- [ ] Sections: Overview (read-only summary), Attachments/Receipts (if data exists), Activity/Audit (stub is fine).
- [ ] Data: `useQuery` keyed by `createCrudQueryKeys("resource").detail(id)`; guard with `enabled: !!id`.
- [ ] Navigations: `Edit` → `/resource/:id/edit`, `Back` → list.

## Create/Edit (`/resource/new`, `/resource/:id/edit`)

- [ ] Shared form component (e.g., `<ResourceForm />`) used for both create and edit; schema with `zod`.
- [ ] Submit mutation calls API client; on success, toast and navigate to `/resource/:id` (detail) and invalidate list/detail queries.
- [ ] Buttons: primary Save, secondary Cancel (navigates back without mutation).

## Query/cache conventions

- [ ] Export query keys from module (e.g., `export const expenseKeys = createCrudQueryKeys("expenses");`).
- [ ] After mutations, call `invalidateResourceQueries(queryClient, "expenses")` (optionally scoped by id).
- [ ] Thread workspace/tenant headers via `apiClient` (already handled globally); avoid manual header wiring.

## UX conventions

- [ ] Keep only one visible primary row action; others go into overflow.
- [ ] Always confirm destructive actions; show busy state during mutation.
- [ ] Keep filter/search inputs in toolbar; avoid mixing with header title area.
