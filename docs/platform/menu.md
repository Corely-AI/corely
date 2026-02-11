# Menu API

## Endpoints

- `GET /menu?scope=web|pos` - returns the composed menu for the current tenant and user. The controller validates `scope` via `GetMenuQuerySchema`, resolves `roleIds` from the JWT (through `AuthGuard` + `@CurrentRoleIds`), fetches grants through `IdentityModule`’s `ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN`, and forwards the computed permissions to `ComposeMenuUseCase`.
- `PUT /menu/overrides?scope=web|pos` - updates tenant-level overrides. The request body must match `UpdateMenuOverridesInputSchema` (which includes the `overrides` payload defined in `MenuOverridesSchema`). Invalid payloads or scopes result in `400 Bad Request`.
- `DELETE /menu/overrides?scope=web|pos` - resets overrides for the tenant and scope. Scope is validated via `GetMenuQuerySchema`.

## Reference

- App-level menu inventory and freelancer defaults: `docs/platform/apps-menu-matrix.md`

## Authorization notes

- The controller relies on the Identity module to provide `roleIds` in the JWT payload (via the updated `AuthGuard`/`TokenService`). These role IDs are used to batch-fetch grants through `RolePermissionGrantRepositoryPort`.
- Effective permissions are built by `shared/permissions/effective-permissions.ts`: `DENY` overrides `ALLOW`, duplicates are folded away, and `*` (allow-all) still respects explicit denies. The resulting string array is what `MenuComposerService` uses.
- The DI token `ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN` lives in `IdentityModule` (surface through `identity.tokens.ts`), so `PlatformModule` just imports `IdentityModule` instead of re-declaring the token.

## Menu Composition

The menu is dynamically composed based on:

1. **Installed Apps**: Apps installed in the tenant.
2. **Entitlements**: Gated by `TenantFeatureOverride` (host-side toggles). If an app is disabled by the host, it is hidden from the menu even if installed.
3. **Permissions**: User's RBAC permissions.
4. **Capabilities**: Workspace capabilities (e.g. `workspace.multiUser`).
5. **Overrides**: Tenant-specific menu overrides (renames, reordering, hiding).

See `TenantEntitlementService` and `MenuComposerService` for implementation details.

## Staff Web Grouping (Option A)

For `scope=web`, the API now returns an app-grouped tree in addition to the flat item list:

- Top-level groups are app-based (`group.appId = AppManifest.appId`).
- Group labels use app manifest names.
- Groups are shown only when the app is enabled **and** has at least one visible staff web menu item.
- Apps like `portal` (`menu: []`) do not appear in staff web navigation.

Response shape:

```json
{
  "scope": "web",
  "items": [...],
  "groups": [
    {
      "appId": "invoices",
      "defaultLabel": "Invoices",
      "icon": "FileText",
      "items": [...]
    }
  ],
  "computedAt": "2026-02-11T00:00:00.000Z"
}
```

Ordering rules:

- Groups: `AppManifest.tier` ascending, then app name, then `appId`.
- Items in group: non-settings first, then `order` ascending, then label/id tie-break.
- Settings-last detection:
  - route starts with `/settings` or contains `/settings/`
  - or route ends with `/settings`
  - or item id ends with `-settings`
  - or section is `settings`
