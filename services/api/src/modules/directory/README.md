# Directory Module (Public Berlin Listing)

## Public scope resolution

Public endpoints in `v1/public/berlin/*` are pinned to a dedicated directory scope and **do not** trust tenant/workspace headers from browsers.

The API resolves scope from env:

- `DIRECTORY_PUBLIC_TENANT_ID`
- `DIRECTORY_PUBLIC_WORKSPACE_ID`

This keeps listing data isolated from customer tenant headers while still using standard tenant-scoped persistence and outbox delivery.

If env values are omitted, the module falls back to the seeded defaults:

- `directory-public-tenant`
- `directory-public-workspace`

## Seeded data

Migration `20260222220000_add_directory_module` seeds a small Berlin Vietnamese restaurant catalog under:

- `tenantId = directory-public-tenant`
- `workspaceId = directory-public-workspace`

For local development, set env values to match those defaults (or insert your own directory records under your configured scope).

## Admin endpoints

Backoffice CRUD endpoints are exposed at `v1/admin/directory/restaurants/*`.

- Auth + RBAC required
- Permission key: `directory.restaurants.manage`
- Admin CRUD writes to the same dedicated directory scope resolved from:
  - `DIRECTORY_PUBLIC_TENANT_ID`
  - `DIRECTORY_PUBLIC_WORKSPACE_ID`

This keeps admin edits and public reads on the same dataset.
