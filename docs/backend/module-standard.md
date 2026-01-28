# Backend Module Standard

## Layering template (per bounded context)

```
<module>/
  http/              # controllers, DTOs, mappers, route contracts
  application/       # use-cases (commands/queries), ports, service orchestrators
  domain/            # entities, value objects, domain events/services (framework-free)
  infrastructure/    # adapters (Prisma/repos, external clients, audit/outbox/idempotency)
  policies/          # RBAC/ABAC checks; reusable assertions
  __tests__/         # fast unit/integration tests
  index.ts           # module wiring (providers, exports)
```

Rules: controllers call use cases (no direct repo calls); repositories live in infrastructure; shared code does not import module internals. Keep DTO/mapper suffixes aligned with `docs/conventions/naming-conventions.md`.

## Request context (UseCaseContext)

Shape (from `services/api/src/shared/request-context`):

- `tenantId` | `workspaceId`
- `userId`
- `roles` / `scopes` (optional)
- `requestId`, `correlationId`
- `metadata` (optional)
- `idempotencyKey` (optional for writes)
  Extraction: use `RequestContextInterceptor` globally + `toUseCaseContext(req)`/`buildUseCaseContext(req)` helpers in controllers. Do not read tenant/workspace headers manually; prefer authenticated principal + workspace header precedence.
- **Tenancy Enforcement**: Use cases that require tenant context MUST use the `@RequireTenant()` decorator on the class. This ensures `ctx.tenantId` is present before execution.

## List/query contract (HTTP)

- Query params: `q`, `page`, `pageSize` (or `cursor`), `sort`, `filters` (JSON or repeated keys), plus module-specific filters (status/date range/customerId/etc.).
- Response (page-based): `{ items, pageInfo: { page, pageSize, total, hasNextPage } }`
- Response (cursor-based): `{ items, nextCursor: string | null, pageSize?: number }`
- Keep legacy params as aliases during migration; convert inside controller to the standard DTO.

## Validation, errors, and policies

- DTO validation in `http/` with Zod schemas from `@corely/contracts` or local schemas. Map to use-case input types.
- Use-case invariants belong in `domain/` or `application/` (e.g., status transitions).
- Errors: throw domain `AppError` variants or return `Result` with `UseCaseError`; let `ProblemDetailsExceptionFilter` format RFC7807 responses. Avoid raw Nest exceptions except for simple 404/400 shims during migration.
- Policies: add `policies/` helpers (e.g., `assertCan(context, permission, resource?)`) and call them in use cases before mutations. Controllers should still enforce guards (AuthGuard + RbacGuard/WorkspaceCapabilityGuard) for defense in depth.

## Audit logging, events, idempotency

- Writes should log audit entries via `AuditPort` (actor, tenant/workspace, action, entity, metadata/diff).
- Emit domain/outbox events from use cases when state changes; enqueue via shared outbox port in the same transaction where possible.
- Idempotency: accept `Idempotency-Key` (header) or DTO field; use `IdempotencyStoragePort` to short-circuit repeats for create/delete operations. Keep `IdempotencyInterceptor` optional per route but prefer use-case-level checks.

## Pagination helpers & parsing

- Use shared helper (to be added under `services/api/src/shared/http/pagination`) to parse `q/page/pageSize/sort/filters` into typed query DTOs.
- Build `pageInfo` using a shared `buildPageInfo(total, page, pageSize)` helper; keep sort parsing centralized to avoid injection bugs.

## Standard module wiring

- `index.ts` exports module class and providers; module file wires ports → adapters (Prisma repos, external services, audit/idempotency/outbox/logger/clock).
- Controllers and tools should rely on exported application service (e.g., `<Module>Application`) that groups use cases for DI.
- Tests use `testkit/` fakes/builders for repo/ports; favor unit tests around use cases and light integration tests per module.

## Migration checklist (per module)

- [ ] Split folders into `http/`, `application/`, `domain/`, `infrastructure/`, `policies/`, `__tests__/`.
- [ ] Ensure controllers use `buildUseCaseContext`/`toUseCaseContext` and do not call repositories directly.
- [ ] Normalize list endpoints to standard params/response while keeping compatibility aliases.
- [ ] Add policy checks in use cases; keep guards on controllers.
- [ ] Add audit logging + outbox events to mutations; wire idempotency for creates/deletes.
- [ ] Standardize error handling to ProblemDetails via use-case mappers; remove inline `BadRequestException` where possible.
