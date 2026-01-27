# Architecture Rules Checklist

Use this checklist for all PR reviews and architectural decisions.

## Repo Structure & Boundaries

- [ ] **Pure Contracts**: `packages/contracts` must not import any other internal packages.
- [ ] **Frontend Application Boundaries**: `apps/web` must not direct-import backend modules.
- [ ] **Backend Isolation**: `services/api` must not direct-import frontend UI code.
- [ ] **Feature Isolation**: Shared packages (`packages/*`) must not import feature code from `apps/` or `services/`.
- [ ] **Clean Build**: No typecheck errors or circular dependencies allowed.

## Backend Architecture (Bizflow)

- [ ] **Module Structure**: `http/` (Controller, DTO), `application/` (Use Cases), `domain/` (Entities), `infrastructure/` (Prisma/Adapters).
- [ ] **Data Access Layer**: DIRECT PRISMA ACCESS IS FORBIDDEN in Controllers and Use Cases. Usage only allowed in `infrastructure/`.
- [ ] **Inter-Module Communication**: No cross-module DB reads/writes. Use Events (Outbox) or Public Application Service.
- [ ] **Controller Logic**: Controllers must be thin; delegate to `ApplicationService` or `UseCases`.
- [ ] **One Class Per File**: Avoid bunching use cases into a single file (`*.usecases.ts` anti-pattern).
- [ ] **Idempotency**: Mutations (Create/Delete) must check `IdempotencyStoragePort` using `Idempotency-Key` if critical.
- [ ] **Audit Trail**: Sensitive writes must log to `AuditPort`.

## Frontend Architecture (Web)

- [ ] **Route Structure**: `/resource` (List), `/resource/new`, `/resource/:id` (Detail).
- [ ] **State Management**: List state (page, sort, filters) must sync with URL.
- [ ] **React Query**: Centralized keys (`createCrudQueryKeys`), mutations must invalidate relevant queries.
- [ ] **UI Consistency**: Use shared `CrudListPageLayout`, `CrudRowActions`, `ConfirmDeleteDialog`.
- [ ] **Module Boundaries**: `app/` is for composition only; implementation lives in `modules/`.

## Tenancy & Security

- [ ] **Tenant Scoping**: All DB queries must be scoped by `tenantId`/`workspaceId` in the `where` clause.
- [ ] **Update Safety**: Updates must check ownership (`where: { id, tenantId }`) before or during execution.
- [ ] **Context**: Tenant/User context must be extracted consistently (`buildUseCaseContext`).
