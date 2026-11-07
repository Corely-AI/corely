# Corely — Connected, AI-native apps

Corely is a collection of connected, AI-native apps for running a team’s
internal operations. Teams start with the capabilities they need and expand
into finance and specialist operations as their work demands.

Start with the [product strategy](docs/products/corely/README.md),
[focused launch proposal](docs/products/corely/launch-plan.md),
[32-app map](docs/products/corely/app-catalog.md), and
[repository evidence](docs/products/corely/repository-alignment.md).
The catalog is a long-term map, not a delivery commitment or availability list.
Finance is optional; accounting is not a prerequisite for operational apps.

## Table of Contents

- [Corely — Connected, AI-native apps](#corely--connected-ai-native-apps)
  - [Table of Contents](#table-of-contents)
  - [What is Corely?](#what-is-corely)
  - [Key features](#key-features)
    - [Kernel \& modularity](#kernel--modularity)
    - [Reliability primitives](#reliability-primitives)
    - [Security primitives](#security-primitives)
    - [Developer experience](#developer-experience)
  - [Open-source kernel, commercial packs](#open-source-kernel-commercial-packs)
  - [Architecture at a glance](#architecture-at-a-glance)
    - [Dependency direction rules](#dependency-direction-rules)
  - [Monorepo layout](#monorepo-layout)
  - [Getting started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Quick start](#quick-start)
      - [UI-first / mock profile](#ui-first--mock-profile)
      - [Full stack (web + API + Postgres/Redis)](#full-stack-web--api--postgresredis)
    - [Environment files](#environment-files)
  - [Environment variables](#environment-variables)
  - [Scripts](#scripts)
  - [Development modes](#development-modes)
  - [Built in public](#built-in-public)
  - [How to add a new module](#how-to-add-a-new-module)
  - [Contributing](#contributing)
  - [Security](#security)
  - [Roadmap](#roadmap)
  - [License](#license)
  - [Acknowledgements](#acknowledgements)

## What is Corely?

- Connected capabilities organized around operational outcomes. The proposed initial package has Schedule, Team, and Daily Work experiences; its segment and adoption model still need validation.
- A modular monolith with existing Booking/OpenBuk, CRM, finance, POS and vertical capabilities. These remain maintained without all becoming launch priorities.
- AI-native direction: AI proposes and explains, deterministic application logic validates, and authorized users approve sensitive actions. Reuse existing Copilot tooling; see the [target policy and implementation limits](docs/ai/ai-copilot.md).
- Bounded contexts keep each module’s domain model, use cases, and migrations isolated so teams can own vertical packs safely.
- Hexagonal ports/adapters let use cases stay framework-free while adapters live in NestJS, Prisma, Redis, or UI layers.
- Outbox + API-hosted background jobs power reliable automations, and CQRS-lite read models keep dashboards responsive without polluting the write model.
- Idempotency, transactional outbox, audit and tenancy are required safeguards; their presence is not a claim that every journey has been audited.

## Key features

### Kernel & modularity

- Modular monolith with shared contracts (`packages/contracts`), pure domain rules (`packages/domain`), and a kernel of standard use cases.
- Packs add UI, migrations, and integrations in their own folders so restaurant/hotel/factory features compose the kernel instead of fork it.
- Clear ownership boundaries remove direct cross-module DB writes; modules talk through contracts, events, and the API surface.

### Reliability primitives

- Outbox pattern plus API-hosted background execution deliver domain events, retries, and process managers for automations.
- CQRS-lite read services keep dashboards fast while write use cases remain strict and transactional.
- Write commands/tool calls must use appropriate idempotency and audit controls. Coverage varies; the repository alignment records observed exceptions.

### Security primitives

- Tenant/workspace context and RBAC infrastructure in the API; per-operation enforcement still requires inspection. Menu visibility is not authorization.
- **Declarative Tenancy**: `@RequireTenant()` supports context validation where applied; it does not establish every endpoint’s authorization policy.
- Audit log captures critical actions, including AI tool executions and POS commands, with immutable metadata.
- Tool runs surface confidence, provenance, and trace IDs so consumers can safely retry or investigate.

### Developer experience

- `pnpm` workspace orchestrates apps (`apps/web`, `apps/pos`, `apps/e2e`), services (`services/api` with API-hosted background execution), and shared packages.
- Contracts package centralizes schemas, enums, and tool cards so frontend and backend speak the same language.
- Older docs describe a UI-first mock server, but this commit has no tracked `services/mock-server` runtime/package or root `dev:mock` script.
- Prompt definitions and versioning live in [prompt management](docs/ai/prompt-management.md).

## Open-source kernel, commercial packs

- **Core OSS kernel:** everything in this repository is AGPL-3.0-only unless a file or folder states otherwise.
- **Enterprise Packs / EE:** distributed separately under a commercial license; they integrate via ports/interfaces and runtime registration (no direct OSS imports).
- **Trademarks:** “Corely” name and logos are protected by trademark and brand usage rules.
- Details: [licensing](docs/devops/licensing.md), [EE boundary](ee/README.md), and [trademarks](docs/TRADEMARKS.md). Commercial terms/contact placeholders are not new approved terms.

## Architecture at a glance

DDD bounded contexts → Hexagonal ports/adapters → Outbox + Background Jobs → CQRS-lite reads + idempotent commands + audit by default.

```mermaid
flowchart LR
  subgraph Clients
    Web["apps/web (Vite)"]
    POS["apps/pos (POS shell)"]
  end
  subgraph Shared
    Contracts["packages/contracts"]
    Domain["packages/domain"]
    Data["packages/data"]
  end
  subgraph Backend
    API["services/api"]
  end
  Web --> Contracts
  Web --> Domain
  POS --> Contracts
  POS --> Domain
  API --> Contracts
  API --> Domain
  API --> Data
```

### Dependency direction rules

- `apps/web` & `apps/pos` → `packages/contracts`, `packages/domain`
- `services/api` → `packages/contracts`, `packages/domain`, `packages/data`
- `packages/domain` → `packages/contracts`
- **Forbidden:** `packages/contracts` importing other workspace code, frontend importing backend internals, backend importing UI assets, or any module writing another module’s tables directly.
- Architecture patterns: DDD bounded contexts, Hexagonal ports/adapters, Outbox + background jobs for automation, CQRS-lite reads for dashboards, idempotent commands and audit trails as defaults.

## Modules

This is a current code inventory, separate from the proposed product catalog.
Module imports and manifests do not prove complete production-ready journeys.

- **Foundation**: identity, workspaces, platform/entitlements, customization, documents, notifications, integrations and AI tooling.
- **Customer/commerce**: party, CRM/mail, sales, catalog, invoices, payment methods and tax.
- **Operations/finance**: Booking/OpenBuk, inventory, purchasing/payables, expenses, accounting and cash management; SaaS billing is separate from customer invoices.
- **Execution**: workflow, approvals and API-hosted background handlers; an automation module import alone proves no complete automation product.
- **Other verticals**: POS, restaurant, classes/coaching, rentals, directory, portfolio, website/CMS and forms.

Employee Tasks, People/absence and Shifts are proposed capabilities with gaps;
workflow tasks, auth users, resource availability and portfolio projects have
distinct semantics. See the [alignment table](docs/products/corely/repository-alignment.md).

## Monorepo layout

```text
apps/
  e2e/                        # End-to-end suites
  pos/                        # Offline-first POS shell
  public-web/                 # Next.js public site (portfolios, rentals, CMS)
  web/                        # Vite-based admin UI
  openbuk-web/                # Focused Vite booking product
  freelancer/, crm/           # Focused Vite clients
  cash-management/            # Focused Vite cash client
  portal/, restaurant-listing/, landing/ # Other Vite entry points
  website-runtime/            # Next.js website runtime
  eric-wategay/               # .NET ERiC gateway (not a pnpm workspace)

services/
  api/                        # NestJS API (RBAC, tools, workflows, background jobs)

packages/
  api-client/
  auth-client/
  config/
  contracts/
  core/
  data/
  domain/
  email-templates/
  kernel/
  offline-core/
  offline-rn/
  offline-web/
  pos-core/
  testkit/
  tooling/
  ui/, web-shared/, web-features/ # Shared design system, infrastructure and features

docs/
assets/
docker/
scripts/
```

## Getting started

### Prerequisites

- Node.js 22.19+ (LTS recommended)
- `pnpm` 10+
- Docker (optional: Postgres/Redis via `docker-compose.dev.yml`, `docker-compose.local.yml`, or Alpine scripts)

### Quick start

1. Install dependencies and copy env scaffolding:
   ```bash
   pnpm install
   cp .env.example .env
   ```
2. Set `VITE_API_BASE_URL` to your configured API, typically `http://localhost:3000` locally. The historical mock runtime is absent.
3. Start the stack you need:

#### UI-first / mock profile

Older notes refer to `services/mock-server`, but no tracked source/package or
root `dev:mock` script exists in the inspected commit. Do not assume a mock
backend starts. Use an available configured API for UI work; mock restoration
would be a separate engineering task.

#### Full stack (web + API + Postgres/Redis)

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:public
```

Ensure Postgres/Redis are reachable (use `docker compose -f docker-compose.dev.yml up` if needed). When you want everything wired together, `pnpm dev` builds packages then starts all services.

### Environment files

- Global defaults: `.env.example`, `.env.dev.example`, `.env.e2e.example`; copy the one that matches your workflow into a `.env` file at the repo root.
- Services and apps pick values from that `.env` (web uses `VITE_` prefixed keys, API references connection strings directly).

## Environment variables

| Name                                   | Used by                       | Example                                                         | Notes                                                       |
| -------------------------------------- | ----------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`                         | `@corely/api`, `@corely/data` | `postgresql://corely:corely@postgres:5432/corely?schema=public` | Prisma connection for commands, outbox, and read models.    |
| `REDIS_URL`                            | `@corely/api`                 | `redis://redis:6379`                                            | Queues, locks, rate limits, idempotency caches.             |
| `VITE_API_BASE_URL`                    | `apps/web`, `apps/pos`        | `http://localhost:4000`                                         | Switch between mock (`4000`) and real API (`3000`).         |
| `LOG_LEVEL`                            | All services                  | `debug`                                                         | Controls structured logging verbosity.                      |
| `AI_MODEL_PROVIDER`                    | `@corely/api`                 | `openai`                                                        | Selects `openai` or `anthropic` for Copilot tool runs.      |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | `@corely/api`                 | `(redacted)`                                                    | Provider credentials for assistant/tool calls; keep secret. |
| `EMAIL_PROVIDER`                       | `@corely/api`                 | `resend`                                                        | Controls transactional email adapter.                       |
| `WEB_PORT`, `PORT`, `MOCK_PORT`        | Apps/services                 | `8080`, `3000`, `4000`                                          | Override ports when composing services locally.             |

## Scripts

Common scripts include:

- `pnpm dev` – builds shared packages and runs all services/apps in parallel.
- `pnpm dev:web`, `pnpm dev:api`, `pnpm dev:api:debug`, `pnpm dev:openbuk`, `pnpm dev:public`, `pnpm dev:pos` – start selected surfaces.
- `pnpm build`, `pnpm build:web`, `pnpm build:api` – compile packages plus apps/services.
- `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm format:check` – workspace-wide quality gates.
- `pnpm check` – `lint` + `typecheck` + `prompt:check`.
- `pnpm docs:dev`, `pnpm docs:check` – public documentation tooling (uses npx; requires Mintlify availability).
- `pnpm prisma:migrate` – apply committed Prisma migrations for `@corely/data`.
- `pnpm prisma:migrate:dev` – create/apply local development migrations; requires PostgreSQL `CREATEDB` or `SHADOW_DATABASE_URL`.
- `pnpm prisma:generate` – regenerate the Prisma client.

## Development modes

- **UI development:** use the configured API; historical mock-first instructions need a separate runtime restoration before use.
- **Full backend stack:** `services/api` uses NestJS guards, Prisma, the outbox table, idempotency ports, workflow queues, and background handlers. `packages/data` owns the Prisma client and repositories.

## Built in public

- [Documentation index](docs/README.md) links current guidance and dated implementation reports. Historical reports are not current verification.
- Begin with existing ownership and the requested slice, then update contracts, tests and docs as appropriate.
- Large changes start with an issue describing intent; small focused improvements are welcome.

## How to add a new module

First inspect existing owners and [reuse boundaries](docs/architecture/connected-apps.md). A product app name does not require a module, surface, schema or service. Once a new module is explicitly justified:

1. **Contracts first:** add Zod schemas, enums, and tool definitions inside `packages/contracts/src/<module>` so web, POS, and API share the surface.
2. **Backend module:** create `services/api/src/modules/<module>` folders with domains, use cases, DTOs, and Nest controllers that depend only on ports/adapters.
3. **Database persistence:** For small modules, use `ext.kv` or `ext.entity_attr` (no new tables). For larger modules, add models to `packages/data/prisma/schema/*.prisma` assigned to the correct domain bucket (e.g., `@@schema("crm")`) and create a repository in `packages/data/src`.
4. **Frontend module:** mirror the module in `apps/web/src/modules/<module>` (screens, hooks, routes) and point to the shared contracts plus the HTTP client.
5. **Validation:** add appropriate domain/adapter/critical-flow checks; do not assume the historical mock runtime exists.

Keep the boundaries: API modules use ports/interfaces, background jobs consume the module’s events, and clients never import backend internals.

## Contributing

- Open an issue for any larger initiative so maintainers can track scope before code.
- Small, focused PRs that pass `pnpm lint`, `pnpm typecheck`, and relevant tests get reviewed faster.
- Update docs or [implementation notes](docs/guides/IMPLEMENTATION_SUMMARY.md) when you touch workflows, contracts, or module behavior.
- Code style follows the shared configs (`eslint.config.js`, `prettier.config.js`). Run `pnpm format` and `pnpm lint:fix` when you add or move files.
- See `CONTRIBUTING.md` for setup, DCO sign-off, and review expectations. Community standards live in `CODE_OF_CONDUCT.md`.

## Security

Please follow `SECURITY.md` for private reporting and response expectations. Placeholder contact: **<SECURITY_EMAIL>**.

## Roadmap

The [strategy](docs/products/corely/README.md) and [launch proposal](docs/products/corely/launch-plan.md)
recommend one operational package, then evidence-led expansion. They supersede
ERP-first catalog-completeness planning. Shifts is conditional; finance and other
specialists follow actual need. The [32-app catalog](docs/products/corely/app-catalog.md)
is not an implementation order, availability claim or authorization for a rewrite.
Existing registries, finance and vertical code remain maintained.

## License

Corely Community is licensed under **AGPL-3.0-only**. Enterprise Packs are commercial and distributed separately. Trademarks are governed by [trademark guidance](docs/TRADEMARKS.md).
See [LICENSE](LICENSE) and [licensing](docs/devops/licensing.md) for details.

## Acknowledgements

Built on Vite, React, NestJS, Prisma, BullMQ, and XState along with the ideas documented in [architecture](docs/architecture/architect.md) and [structure](docs/architecture/overall-structure.md).
