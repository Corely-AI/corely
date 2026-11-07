# Instructions for AI Agents

## Delivery workflow and skills

Read the [Corely Engineering Guide](docs/engineering-guide.md) for the concise
maintainer/agent workflow and the [skills catalog](docs/ai/skills-management.md)
for task-specific procedures under `.agents/skills/`. Load only relevant skills.
They support these instructions and do not expand task authorization.

Deliver each implemented ticket on its own `<issue-number>-<short-summary>` branch
and linked Draft PR. Never use `codex/` as a branch prefix. Honor explicit
local-only/no-commit/no-push limits. Verify the actual base and remote; do not
assume `main`. Read-only/planning work does not need empty PRs. Use the
[PR template](.github/pull_request_template.md).

For interface changes, inspect the rendered flow and include screenshots or a
recording plus relevant UI/UX states/viewports in the PR before requesting review.
Missing material visual or interaction evidence keeps the PR Draft. Backend-only
or prose-only changes explain why UI/UX evidence is not applicable. Follow
[CONTRIBUTING](CONTRIBUTING.md) for DCO sign-off; do not auto-merge or deploy.

## Product identity and scope

Corely is a collection of connected, AI-native apps for running a team’s
internal operations. Teams start with the capabilities they need and expand
into finance and specialist operations as their work demands.

- Internal operations first; finance is optional.
- Accounting is not a prerequisite for operational apps.
- Retain the modular-monolith foundation and existing capabilities.
- Customers buy an operational outcome; apps organize capabilities.
- Start with one customer segment and one focused operational package.
- Expand through demonstrated demand, not catalog completeness.
- The proposed initial package has Schedule, Team, and Daily Work experiences.
- Segment, adoption model, pricing, and product-market fit remain hypotheses.
- Internal-first does not mean internal-only: preserve public booking.

Read [product strategy](docs/products/corely/README.md),
[launch proposal](docs/products/corely/launch-plan.md), and
[repository evidence](docs/products/corely/repository-alignment.md).
The [32-app catalog](docs/products/corely/app-catalog.md) is a long-term map,
not a delivery commitment or claim of availability.

Complete only the explicitly requested slice. Catalog inclusion does not
authorize scaffolding apps, rewriting architecture, removing finance, or
expanding platform infrastructure. Deferred investment still permits maintenance.
Preserve more-specific instructions applicable to the files you touch.

## Vocabulary before implementation

- **Platform:** shared identity, tenant/workspace context, authorization,
  documents, notifications, audit, integrations, background execution, and AI.
- **Product app:** recognizable user-facing capability such as Tasks or Expenses.
- **Domain module:** implementation boundary owning business rules and records.
  Apps and modules need not map one-to-one.
- **Surface:** deployed client or entry point under `apps/*`.
  Each product app does not require a separate frontend deployment.
- **Customer package:** focused offering composed of capabilities, without
  automatically creating a service, database, or subscription per app.

A marketing name does not establish a bounded context or database schema.
Keep catalog discussion IDs separate from existing runtime `appId` values.
See [connected-app architecture](docs/architecture/connected-apps.md).

## Repository map (inspected 2026-11-07)

- `apps/web`: Vite + React administration UI, including booking routes.
- `apps/openbuk-web`: focused Vite booking client, reusing the Booking owner.
- `apps/freelancer`, `apps/crm`, `apps/cash-management`: focused Vite clients.
- `apps/portal`, `apps/restaurant-listing`, `apps/landing`: Vite entry points.
- `apps/public-web`: Next.js public journeys, including booking and checkout.
- `apps/website-runtime`: Next.js website runtime.
- `apps/pos`: Expo + React Native POS client.
- `apps/e2e`: Playwright test workspace, not a customer product.
- `services/api`: NestJS modular monolith with PostgreSQL + Prisma.
- `services/api/src/modules/background`: API-hosted outbox processing,
  scheduled runners, and workflow handlers. Do not recreate `services/worker`.
- `apps/eric-wategay`: .NET ERiC tax gateway; not a pnpm frontend workspace.
- `services/mock-server`: historical documentation path; no tracked runtime found.
- `packages/contracts`: shared Zod schemas and wire types.
- `packages/kernel`, `packages/domain`, `packages/core`: shared primitives,
  pure business rules, and workflow engine respectively.
- `packages/data`: Prisma, persistence adapters, and extension storage.
- `packages/ui`: design-system primitives and tokens.
- `packages/web-shared`: shared providers, clients, layout, and infrastructure.
- `packages/web-features`: reusable feature exports for focused clients.
- `packages/prompts`, `packages/integrations/*`: prompts and integration adapters.
- `packages/offline-*`, `packages/pos-*`: offline and POS building blocks.
- `docs-site`: public Mintlify documentation in English, German, and Vietnamese.
- `ee`: commercial-distribution placeholder; OSS must not import EE directly.

The alignment document records inspected surfaces and checkout changes.
OpenBuk has its own client but shares Booking records and the existing API.

## Reuse before build

Before adding a capability:

1. Inspect the existing owner, contracts, application use cases, adapters, tests,
   UI routes, manifests, registries, shared UI, and integrations.
2. Map the requested outcome to existing owners; record gaps and conflicts.
3. Extend public contracts/ports rather than duplicating records or screens.
4. Add new ownership only when justified by the explicitly requested scope.

Booking already owns reservations/resources; Appointments must assess it first.
Accounting, invoices, expenses, purchasing, CRM, POS, and other domains exist;
their code remains maintained even when outside the focused launch.
Workflow execution tasks and CRM activities are not automatically employee Tasks.
Employees, auth accounts, parties, and bookable resources are distinct concepts.
Do not duplicate customers, suppliers, approvals, files, billing, or permissions.
Focused clients reuse package exports; never import another app’s private screens.

## Architecture and contracts

- Preserve strict boundaries in `services/api/src/modules`.
- Follow [BOUNDARIES.md](docs/architecture/BOUNDARIES.md).
- Hexagonal layering: pure `domain`, application use cases and ports,
  infrastructure adapters, and thin HTTP/tool adapters.
- Domain code has no NestJS, Prisma, or React dependencies.
- Controllers and tools delegate to application use cases.
- Keep Prisma access behind owning persistence adapters.
- Do not read/write another module’s tables directly; use public interfaces,
  explicit ports, or domain events via transactional outbox.
- Put shared wire schemas/types in `packages/contracts`; do not duplicate them.
- Preserve compatibility for public routes, contracts, queued commands, and events.
- No premature service extraction or orchestration layer to match app names.

## Persistence policy (unchanged)

Follow [Database Persistence Strategy](docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md).

1. **Domain buckets:** medium modules use the appropriate existing schema with
   `@@schema("bucket_name")`; a product app is not a schema.
2. **Extension storage:** small modules do not create tables. Use `ext.kv`,
   `ext.entity_attr`, and `ext.entity_link` through `@corely/data` services/ports
   such as `ExtKvService` and `ExtEntityAttrService`.
3. **Heavy modules:** a dedicated schema for massive modules (20+ tables)
   requires architectural approval.

Historical “1000+ modules” language describes scalability, not the roadmap.
Product reframing does not authorize storage changes or migrations.

## Tenancy, authorization, and reliability

- Preserve actual tenant/workspace boundaries and authenticated request context.
- Scope reads, writes, indexes, and uniqueness appropriately to owned data.
- Do not treat tenant ID and workspace ID as interchangeable identities.
- Public workspace authority comes from trusted server-side resolution and
  publish/module checks, not untrusted client-supplied tenant IDs.
- Tenant app enablement, workspace capabilities, product subscriptions,
  user permissions, and backend authorization are distinct controls.
- Menu visibility and frontend route guards are not backend authorization.
- Reuse manifests, dependency resolution, entitlements, and menu composition.
- Enforce backend access and business invariants for every relevant command.
- Record sensitive actions through existing audit ports.
- Write state changes and domain events transactionally via the outbox.
- Commands and background deliveries require idempotency and safe retries.
- Do not claim these safeguards are universally audited or implemented;
  record observed exceptions and address them only within authorized scope.

## AI behavior

AI proposes and explains; deterministic application logic validates;
authorized users approve sensitive actions.

- Reuse existing `ai-copilot`, tool registries, prompts, and background runtime.
- Authorize before retrieval and again before execution; isolate tenant/workspace.
- Provide sources, freshness, and uncertainty; treat imported content as data.
- Validate schedules, calculations, permissions, and transitions deterministically.
- Revalidate proposals before execution through application use cases.
- Require confirmation for sensitive AI-originated changes and external messages.
- Preserve private personnel data boundaries; expose neutral availability only.
- Keep manual workflows useful when AI is unavailable.
- Preserve explicitly configured deterministic automation policies separately.
- Do not infer autonomous employment, candidate ranking, employee scoring,
  lending, bank-detail changes, or fund release from the product direction.

See [AI target policy and evidence](docs/ai/ai-copilot.md).

## Coding, testing, and documentation

- Strict TypeScript; no `any` in new code.
- `kebab-case` files, `PascalCase` classes/components, `camelCase` functions/variables.
- Unit tests for domain logic, integration tests for adapters, E2E for critical flows.
- Test presence, module imports, and manifests do not prove production readiness.
- Historical results are not fresh test runs; report actual checks and skips.
- Keep list/detail CRUD conventions; operational entry points may use calendars,
  boards, decision inboxes, daily views, or self-service where justified.
- Separate current implementation, target design, and unvalidated hypotheses.
- Update [docs index](docs/README.md) and relevant docs for significant changes.
- No blanket legal/compliance or validated-market claims without evidence.
- Keep AGPL/community/commercial claims tied to [LICENSE](LICENSE),
  [licensing notes](docs/devops/licensing.md), and [EE boundaries](ee/README.md).

## Reading order and commands

Read this file, product strategy/alignment, boundaries/persistence, then the
owning module and relevant contracts/tests. For implementation use the
[module guide](docs/guides/MODULE_IMPLEMENTATION_GUIDE.md),
[CRUD standard](docs/frontend/crud-ui-standard.md),
[shared UI](docs/frontend/shared-ui.md), and
[Copilot streaming guide](docs/ai/COPILOT_STREAMING.md).
Check `.agent/workflows` if present; it is absent in the inspected commit.
Read [CONTRIBUTING.md](CONTRIBUTING.md) for DCO and contribution rules.

Verified script names in root `package.json` (not all executed):

```sh
pnpm dev:web
pnpm dev:api
pnpm dev:public
pnpm dev:openbuk
pnpm dev:pos
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:int
pnpm arch:check
pnpm format:check
pnpm docs:check
```

Integration/E2E commands may require a configured environment. For prose-only
changes use installed Prettier on changed files and targeted link checks;
do not run migrations or install tooling just to update documentation.
