# Tenant Features And Menu Permissions

This note captures the current implementation around:

- `TenantFeaturesTab.tsx`
- how the web app sidebar menu is filtered by permissions, entitlements, and capabilities

It complements, but does not replace, the broader menu documentation in [`docs/platform/menu.md`](./menu.md).

## Tenant Features Tab

The tenant feature editor lives in:

- `apps/web/src/modules/platform/screens/tenant-management/TenantFeaturesTab.tsx`

It is mounted by:

- `apps/web/src/modules/platform/screens/tenant-management/TenantEntitlementsPage.tsx`

### What the component does

`TenantFeaturesTab` is a tenant-level feature override editor. It does not render navigation and it does not directly decide which menu items are visible.

Its responsibilities are:

1. Receive a resolved feature list from the parent page.
2. Let the user search features by key, translated label, or string value.
3. Render an editor based on the current value type:
   - `boolean` -> `Switch`
   - `number` -> numeric `Input`
   - everything else -> text input, with objects serialized as JSON
4. Save feature overrides through `platformEntitlementsApi.updateFeatures(...)`.
5. Reset feature overrides through `platformEntitlementsApi.resetFeature(...)`.
6. Display the source of the effective value:
   - `tenantOverride`
   - `plan`
   - `default`

### Data shape

The frontend API helper currently defines:

- `ResolvedFeatureValue`
- `TenantEntitlementsResponse`

in:

- `packages/web-shared/src/lib/platform-entitlements-api.ts`

`TenantEntitlementsPage` loads the entitlements payload and passes `entitlements.features` into `TenantFeaturesTab`.

## Important Distinction

There are two related but different concepts:

- **Tenant features / entitlements**: host-side configuration that can enable or disable app capability at the tenant level.
- **User permissions**: RBAC grants attached to the current user through role membership.

The menu uses both.

In practice:

- if an app is disabled for the tenant, its menu items disappear for everyone in that tenant
- if the app is enabled but the current user lacks the required permission, that user's menu items still disappear

## How The Web Menu Is Rendered

For the web sidebar, the primary source is `workspace-config`, not `TenantFeaturesTab`.

### Frontend flow

1. `AppSidebar` reads `navigationGroups` from `useWorkspaceConfig()`.
2. `WorkspaceConfigProvider` fetches `GET /workspaces/:workspaceId/config?scope=web`.
3. The sidebar renders the resulting groups and items.

Relevant files:

- `packages/web-shared/src/layout/app-sidebar.tsx`
- `packages/web-shared/src/shared/workspaces/workspace-config-provider.tsx`

### Backend flow

`GET /workspaces/:workspaceId/config` is handled by:

- `services/api/src/modules/platform/adapters/http/workspace-config.controller.ts`

That controller:

1. resolves the current user's role IDs
2. loads grants for those roles
3. converts grants into an allowed permission list
4. calls `GetWorkspaceConfigUseCase`

The use case then:

1. validates workspace access
2. resolves workspace kind and default workspace capabilities
3. calls `MenuComposerService.composeMenuTree(...)`
4. embeds the resulting grouped menu into `config.navigation.groups`

Relevant file:

- `services/api/src/modules/platform/application/use-cases/get-workspace-config.usecase.ts`

## Where Menu Visibility Is Decided

The main filtering logic lives in:

- `services/api/src/modules/platform/application/services/menu-builder.service.ts`

For each enabled app, the builder reads that app's manifest and keeps only the menu contributions that pass all applicable checks:

1. **Scope**
   - `web`, `pos`, or `both`
2. **Required apps**
   - `requiresApps`
3. **Required capabilities**
   - `requiresCapabilities`
4. **Required permissions**
   - `requiresPermissions`

If any required check fails, the menu item is excluded before the frontend renders anything.

### Source of the rules

Those requirements are declared in app manifests via the menu contribution schema:

- `packages/contracts/src/platform/app-manifest.schema.ts`

Each menu item can declare:

- `requiresApps`
- `requiresCapabilities`
- `requiresPermissions`

## Examples

### Import menu

`services/api/src/modules/import/import.manifest.ts` defines:

- menu item: `import-shipments`
- required capability: `import.basic`
- required permission: `import.shipments.read`

That means the Shipments item is shown only when:

- the tenant has the Import app enabled
- the workspace capability `import.basic` is available
- the current user has `import.shipments.read`

### Platform settings menu

`services/api/src/modules/platform/platform.manifest.ts` defines:

- menu item: `platform-settings`
- required permission: `platform.apps.manage`

So the Platform menu entry is filtered out unless that permission is present.

## Frontend Post-Filtering

After the backend composes the menu, the web frontend applies a small amount of additional filtering.

### Capability post-filter

`WorkspaceConfigProvider` runs `filterNavigationGroups(...)` over the returned navigation tree.

File:

- `packages/web-shared/src/shared/workspaces/navigation.ts`

This removes any menu item whose `requiredCapabilities` are known in the workspace capability map and currently disabled.

### Sidebar-specific filtering

`AppSidebar` then applies a few UI-specific rules:

- hide explicitly hidden item IDs passed into the sidebar
- hide `/settings/platform...` links in non-host scope
- add a separate platform admin section when host-scope permissions allow it

Relevant file:

- `packages/web-shared/src/layout/app-sidebar.tsx`

The host-scope helper hooks are defined in:

- `packages/web-shared/src/shared/lib/permissions.ts`

## Route Protection Still Applies

Menu visibility is not the only protection.

Pages can also be guarded with `RequirePermission`, for example:

- `apps/web/src/app/router/app-settings-routes.tsx`
- `packages/web-shared/src/shared/permissions/RequirePermission.tsx`

So even if a user manually types a URL, the route can still reject access when the required permission is missing.

## Summary

- `TenantFeaturesTab` is a feature override editor, not a menu renderer.
- The web sidebar is driven mainly by `workspace-config`.
- The backend decides most menu visibility in `MenuBuilderService`.
- Menu items are filtered by tenant app enablement, required capabilities, required permissions, and scope.
- The frontend adds a small amount of post-filtering and route-level guards still protect direct navigation.
