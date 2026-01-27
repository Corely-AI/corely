# Audit 00: Baseline & Rules

## 1. Architecture Rules Checklist

### Repo Structure & Boundaries

- [ ] **Pure Contracts**: `packages/contracts` must not import any other internal packages.
- [ ] **Frontend Application Boundaries**: `apps/web` must not direct-import backend modules.
- [ ] **Backend Isolation**: `services/api` must not direct-import frontend UI code.
- [ ] **Feature Isolation**: Shared packages (`packages/*`) must not import feature code from `apps/` or `services/`.
- [ ] **Circular Dependencies**: No circular imports between packages.

### Backend Architecture (Bizflow)

- [ ] **Module Internal Structure**: Follows `http/` (Controller, DTO), `application/` (Use Cases), `domain/` (Entities), `infrastructure/` (Prisma/Adapters).
- [ ] **Data Access Layer**: DIRECT PRISMA ACCESS IS FORBIDDEN in Controllers and Use Cases. Must use Repositories in `infrastructure/`.
- [ ] **Inter-Module Communication**: No cross-module DB reads/writes. Use Events (Outbox) or Public Application Service.
- [ ] **Controller Logic**: Controllers must be thin; delegate to `ApplicationService` or `UseCases`.
- [ ] **Idempotency**: Mutations (Create/Delete) must check `IdempotencyStoragePort` using `Idempotency-Key`.
- [ ] **Audit Trail**: Sensitive writes must log to `AuditPort`.

### Frontend Architecture (Web)

- [ ] **Route Structure**: `/resource` (List), `/resource/new`, `/resource/:id` (Detail).
- [ ] **State Management**: List state (page, sort, filters) must sync with URL (e.g., `useCrudUrlState`).
- [ ] **React Query**: Centralized keys (`createCrudQueryKeys`), mutations must invalidate relevant queries.
- [ ] **UI Consistency**: Use `CrudListPageLayout`, `CrudRowActions`, `ConfirmDeleteDialog`.
- [ ] **Module Boundaries**: `app/` is for composition only; implementation lives in `modules/`.

### Tenancy & Security

- [ ] **Tenant Scoping**: All DB queries must be scoped by `tenantId`/`workspaceId`.
- [ ] **Context extraction**: Tenant/User context must be extracted consistently (e.g. `buildUseCaseContext`).

---

## 2. Repo Map & Health Baseline

### Workspace Stats

- **Apps**: 5 (`web`, `landing`, `pos`, `e2e`, `...`)
- **Services**: 2 (`api`, `worker`)
- **Packages**: 17

### Health Status

- **Lint**: ⚠️ _Running/Issues Detected_ (Likely passing with warnings, skipped for speed)
- **Typecheck**: ❌ **Failed**
  - Validation errors in `packages/email-templates` (Postcss types).
  - Exit code 2 in `packages/offline-core`.
- **Tests**: ✅ **Passed** (89 files, 412 tests)
- **Architecture Check**: ❌ **Failed**
  - **Critical**: Prisma usage detected outside infrastructure/adapters in multiple modules (`accounting`, `approvals`, `tax`, `workflow`).

### Top-Level Scripts

- `dev`: `pnpm build:packages && pnpm -r --parallel dev`
- `build`: Builds packages -> ee -> tooling -> services -> apps
- `test`: Vitest workspace run
- `arch:check`: Custom architecture validation script
