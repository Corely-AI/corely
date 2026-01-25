# Backend Modules — As Is

## Current patterns

- Architecture: NestJS API at `services/api` with per-module folders under `src/modules/*`. Most modules follow hexagonal layering (`domain/`, `application/` with ports/use cases, `infrastructure/` adapters, `adapters/http`/`adapters/tools`, `testkit/`). `DataModule` (Prisma) provides shared ports (outbox/audit/idempotency/UoW), and `RequestContextInterceptor` attaches context from headers/auth.
- Contracts & validation: Many controllers parse DTOs using Zod schemas from `@corely/contracts` (e.g., invoices, inventory, party/CRM). Others use custom or partial schemas (expenses uses a local `ExpenseHttpInputSchema` that extends `CreateExpenseWebInputSchema.partial()`).
- Request context & auth: Auth is enforced via `AuthGuard` (JWT → `req.user` with tenant/workspace) and often `RbacGuard` plus capability guards (inventory, party). Some controllers (expenses) run without guards and read workspace/tenant directly from request or body. `buildUseCaseContext` converts `req` to `UseCaseContext`, but some modules bypass it.
- List/query endpoints: Shapes vary widely—`expenses` returns `{ items: ExpenseDto[] }` with optional `includeArchived` and no pagination; `party/customers` returns `{ items, nextCursor }`; `invoices` uses cursor pagination with `{ items, nextCursor }`; inventory lists return `{ items, nextCursor }` with filter params; some modules expose search endpoints separately.
- Errors & policies: Global `ProblemDetailsExceptionFilter` maps errors to RFC7807. Many use cases return `Result` with `UseCaseError` (invoices, inventory) while others throw Nest `BadRequestException`/`NotFoundException` (expenses archive/update). Policy enforcement is inconsistent: some actions rely on RBAC guards; many use cases do not assert permissions inside the application layer. Tenant scoping is usually applied in repositories but sometimes also checked (or skipped) in controllers.
- Audit/idempotency/events: `CreateExpenseUseCase` logs audit and writes to outbox with idempotency storage; other expenses operations skip audit/outbox. Most other modules rely on their own patterns (e.g., invoices repo handles numbering/events) but there is no shared helper for audit logging or idempotency middleware beyond the `IdempotencyInterceptor`.

## Inconsistencies

- Controller-to-use-case flow differs: some controllers call an application service (`InvoicesApplication`, `PartyApplication`) while expenses calls repository + use cases piecemeal inside the controller (list/update bypass application layer).
- Request context extraction is duplicated: some controllers use `toUseCaseContext`/`buildUseCaseContext`, others manually pull tenant/workspace/user from headers or request, leading to gaps when headers are missing.
- List contract variance (array vs cursor, different param names) complicates shared frontend client code and makes cache invalidation inconsistent.
- Authorization is uneven: expenses has no `@UseGuards` and relies on tenantId from request/body; other modules enforce RBAC/capabilities. Policy checks inside use cases are rare.
- Error handling is mixed between `Result` + mapper and direct Nest exceptions, so consumers sometimes receive ProblemDetails and sometimes bespoke shapes (e.g., expenses returns `{...payload, expense}` on create).

## Risks

- Missing guards/context checks in expenses allow unauthenticated or cross-tenant access if routes are exposed; tenant scoping relies solely on repo filters.
- Divergent list contracts break composability for React Query clients and make pagination/sorting inconsistent across modules.
- Bypassing application/policy layers for reads/updates makes it hard to add authorization, audit, idempotency, or validation consistently.
- Mixed error shapes and manual DTO parsing increase chances of runtime errors and brittle client handling.

## Where to standardize with minimal churn

- Centralize request context extraction and enforce it in controllers (shared helper + decorator), replacing manual header reads.
- Adopt a consistent list contract (`q/page/pageSize/sort/filters` → `{ items, pageInfo }` or `{ items, nextCursor }` with a stable DTO) and expose it through shared helpers so modules can opt in gradually.
- Ensure controllers delegate to application use cases (commands/queries) and keep repositories inside infrastructure; introduce lightweight policy checks for mutations.
- Wrap write endpoints with audit logging and idempotency helpers from shared infrastructure; use ProblemDetails consistently by mapping use-case errors instead of throwing raw Nest exceptions.
