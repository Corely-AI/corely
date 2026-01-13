## Request Context (API)

Purpose: single source of truth for request identity/context (requestId, tenant/workspace, user, roles) with consistent precedence, typed request augmentation, and a safe path to extend (locale, orgId, feature flags, impersonation).

### Precedence & Rules (no legacy fallbacks)

- `requestId`: `x-request-id` → `x-trace-id`/`traceId` from middleware → generated UUID.
- `correlationId`: `x-correlation-id` → `requestId`.
- `userId`: **only** from authenticated principal (`req.user.userId`).
- `tenantId`: **only** from authenticated principal (`req.user.tenantId`); header `x-tenant-id` is considered only when the principal is missing.
- `workspaceId`: **header `x-workspace-id` first**, then route param `workspaceId`, then principal (`req.user.workspaceId`), then `null`. This ensures active-workspace switches via header are honored even when routes include tenant/workspace ids.
- Roles/scopes: from `req.user.roleIds` (array) when present.

### Integration

- Global `RequestContextInterceptor` attaches `req.context` (typed) and sets compatibility aliases (`req.tenantId`, `req.workspaceId`, `req.id`).
- `@Ctx()` decorator returns `RequestContext` in controllers/guards.
- `toUseCaseContext(req)` converts to `UseCaseContext` for application layer.
- Header constants live in `request-context.headers.ts`; types in `request-context.types.ts`; resolver logic in `request-context.resolver.ts`.

### Extensibility

- Add new fields to `RequestContext` and map them in `resolveRequestContext`.
- For internal/impersonation flows, extend resolver options instead of trusting headers.
- ALS hook (`request-context.store.ts`) is ready for logging/telemetry-only usage; avoid using it for authorization decisions.

### Deprecations

- Direct header reads should be replaced with `@Ctx()`/`req.context`.
- `req.tenantId` / `req.workspaceId` remain as shims; do not rely on them long-term.
