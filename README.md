# Corely — AI-native modular ERP kernel

A modular ERP kernel that starts with freelancer workflows (expenses, invoices, assistant) and scales into restaurant, hotel, and factory packs without forking code.

## Table of Contents

- [Corely — AI-native modular ERP kernel](#corely--ai-native-modular-erp-kernel)
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
      - [UI-first (web + mock server)](#ui-first-web--mock-server)
      - [Full stack (web + API + worker + Postgres/Redis)](#full-stack-web--api--worker--postgresredis)
    - [Environment files](#environment-files)
    - [Running OSS vs EE Editions](#running-oss-vs-ee-editions)
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

- A modular kernel built for freelancer workflows (expenses, invoices, assistant) that can layer in full ERP packs (restaurant, hotel, factory) without duplicating the core.
- AI-native by design: contracts define tool schemas, assistant endpoints run through the API with auditable tool executions, retries are idempotent, and every action is logged for traceability.
- Bounded contexts keep each module’s domain model, use cases, and migrations isolated so teams can own vertical packs safely.
- Hexagonal ports/adapters let use cases stay framework-free while adapters live in NestJS, Prisma, Redis, or UI layers.
- Outbox + Worker power reliable automations, and CQRS-lite read models keep dashboards responsive without polluting the write model.
- Idempotency keys, audit trails, and tenant scoping are defaults so even AI or POS retries stay safe.

## Key features

### Kernel & modularity

- Modular monolith with shared contracts (`packages/contracts`), pure domain rules (`packages/domain`), and a kernel of standard use cases.
- Packs add UI, migrations, and integrations in their own folders so restaurant/hotel/factory features compose the kernel instead of fork it.
- Clear ownership boundaries remove direct cross-module DB writes; modules talk through contracts, events, and the API surface.

### Reliability primitives

- Outbox pattern and a dedicated worker deliver domain events, retries, and process managers for automations.
- CQRS-lite read services keep dashboards fast while write use cases remain strict and transactional.
- Every write command/tool call carries an idempotency key plus an audit log entry by default.

### Security primitives

- Tenant-aware schemata (all tables include `tenantId` checks) and RBAC/ABAC guards in the API.
- Audit log captures critical actions, including AI tool executions and POS commands, with immutable metadata.
- Tool runs surface confidence, provenance, and trace IDs so consumers can safely retry or investigate.

### Developer experience

- `pnpm` workspace orchestrates apps (`apps/web`, `apps/pos`, `apps/e2e`), services (`services/api`, `services/worker`, `services/mock-server`), and shared packages.
- Contracts package centralizes schemas, enums, and tool cards so frontend, API, and worker speak the same language.
- Mock server simulates latency, pagination, idempotency, and assistant-tool endpoints, enabling a UI-first workflow before the full stack is ready.
- Prompt definitions and versioning live in `docs/prompt-management.md`.

## Open-source kernel, commercial packs

- **Core OSS kernel:** everything in this repository is AGPL-3.0-only unless a file or folder states otherwise.
- **Enterprise Edition (EE):** distributed as workspace packages under `/ee` with a commercial license. EE packages (`@corely/api-ee`, `@corely/web-ee`, `@corely/shared-ee`) provide multi-tenancy and premium features.
- **Hard dependency boundary:** OSS code **never** statically imports EE packages. EE features are loaded dynamically via bridge loaders (`services/api/src/ee-loader.ts`, `apps/web/src/ee-loader.ts`) when `EDITION=ee` or `VITE_EDITION=ee`.
- **OSS builds without EE:** The repository can build and run successfully even when `/ee` is deleted or not installed. This ensures the OSS edition remains fully functional as single-tenant.
- **Trademarks:** "Corely" name and logos are protected by trademark and brand usage rules.
- Details: see `docs/licensing.md`, `ee/README.md`, `TRADEMARKS.md`, `REFACTOR_SUMMARY.md`, and `VERIFICATION_GUIDE.md`.

## Architecture at a glance

DDD bounded contexts → Hexagonal ports/adapters → Outbox + Worker → CQRS-lite reads + idempotent commands + audit by default.

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
    Worker["services/worker"]
    Mock["services/mock-server"]
  end
  Web --> Contracts
  Web --> Domain
  POS --> Contracts
  POS --> Domain
  API --> Contracts
  API --> Domain
  API --> Data
  Worker --> Contracts
  Worker --> Domain
  Worker --> Data
  Mock --> Contracts
```

### Dependency direction rules

- `apps/web` & `apps/pos` → `packages/contracts`, `packages/domain`
- `services/api`, `services/worker` → `packages/contracts`, `packages/domain`, `packages/data`
- `packages/domain` → `packages/contracts`
- **Forbidden:** `packages/contracts` importing other workspace code, frontend importing backend internals, backend importing UI assets, or any module writing another module’s tables directly.
- Architecture patterns: DDD bounded contexts, Hexagonal ports/adapters, Outbox + Worker for automation, CQRS-lite reads for dashboards, idempotent commands and audit trails as defaults.

## Monorepo layout

```text
apps/
  e2e/                        # End-to-end suites
  pos/                        # Offline-first POS shell
  web/                        # Vite-based admin UI

services/
  api/                        # NestJS API (RBAC, tools, workflows)
    src/ee-loader.ts          # Bridge loader for EE backend (dynamic import)
  worker/                     # NestJS worker (outbox, jobs, integrations)
  mock-server/                # Dedicated mock server for UI-first work

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

ee/                           # Enterprise Edition workspace packages
  api-ee/                     # Backend EE (@corely/api-ee)
    src/tenancy/              # MultiTenantResolver, RoutingService
  web-ee/                     # Frontend EE (@corely/web-ee)
    src/components/           # WorkspaceSwitcher, tenant UI
  shared-ee/                  # Shared EE utilities (@corely/shared-ee)

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
2. Set `VITE_API_BASE_URL` to `http://localhost:4000` for the mock profile or `http://localhost:3000` for the full stack.
3. Start the stack you need:

#### UI-first (web + mock server)

```bash
pnpm dev:mock
pnpm dev:web
```

Mock server routes live under `services/mock-server/src/routes`; latency, pagination, and idempotency middleware keep the experience close to the real API.

#### Full stack (web + API + worker + Postgres/Redis)

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:web
```

Ensure Postgres/Redis are reachable (use `docker compose -f docker-compose.dev.yml up` if needed). When you want everything wired together, `pnpm dev` builds packages then starts all services.

### Environment files

- Global defaults: `.env.example`, `.env.dev.example`, `.env.e2e.example`; copy the one that matches your workflow into a `.env` file at the repo root.
- Services and apps pick values from that `.env` (web uses `VITE_` prefixed keys, API/worker reference connection strings directly).
- **Edition configuration:** Set `EDITION=oss` (backend) and `VITE_EDITION=oss` (frontend) for single-tenant OSS, or `ee` for multi-tenant Enterprise Edition. Defaults to `oss`.

### Running OSS vs EE Editions

**OSS Edition (Single-Tenant) - Default:**

```bash
# Start with OSS defaults
pnpm dev:api        # or: pnpm dev:api:oss
pnpm dev:web        # or: pnpm dev:web:oss

# Build OSS (excludes /ee packages)
pnpm run build:oss
```

OSS uses `SingleTenantResolver` and enforces a single `DEFAULT_TENANT_ID`. The workspace switcher UI is hidden.

**EE Edition (Multi-Tenant) - Requires EE Packages:**

```bash
# First, ensure EE packages are built
pnpm --filter './ee/**' build

# Start with EE edition
pnpm dev:api:ee     # Uses MultiTenantResolver
pnpm dev:web:ee     # Shows workspace switcher

# Build EE (includes all packages)
pnpm run build:ee
```

EE dynamically loads `@corely/api-ee` (MultiTenantResolver, tenant routing) and `@corely/web-ee` (WorkspaceSwitcher component) via bridge loaders. Tenants are resolved from routes (`/t/:tenantSlug`), hostnames, or headers.

**Verify OSS Independence:**

```bash
# This script temporarily removes /ee and builds OSS to prove independence
pnpm run ci:verify-oss-no-ee
```

See `VERIFICATION_GUIDE.md` for detailed testing procedures and `ee/README.md` for EE architecture.

## Environment variables

| Name                                   | Used by                                         | Example                                                         | Notes                                                              |
| -------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                         | `@corely/api`, `@corely/worker`, `@corely/data` | `postgresql://corely:corely@postgres:5432/corely?schema=public` | Prisma connection for commands, outbox, and read models.           |
| `EDITION`                              | `@corely/api`, `@corely/web`                    | `oss` or `ee`                                                   | Controls OSS vs EE module registration. Defaults to `oss`.         |
| `DEFAULT_TENANT_ID`                    | `@corely/api`, `@corely/web`                    | `default_tenant`                                                | Required for OSS single-tenant enforcement.                        |
| `DEFAULT_WORKSPACE_ID`                 | `@corely/api`, `@corely/web`                    | `default_workspace`                                             | Required for OSS default workspace.                                |
| `REDIS_URL`                            | `@corely/api`, `@corely/worker`                 | `redis://redis:6379`                                            | Queues, locks, rate limits, idempotency caches.                    |
| `VITE_API_BASE_URL`                    | `apps/web`, `apps/pos`                          | `http://localhost:4000`                                         | Switch between mock (`4000`) and real API (`3000`).                |
| `VITE_EDITION`                         | `apps/web`                                      | `oss` or `ee`                                                   | Enables EE-only UI (tenant switching, /t/:slug routing).           |
| `VITE_DEFAULT_TENANT_ID`               | `apps/web`                                      | `default_tenant`                                                | OSS fallback tenant id; must match backend DEFAULT_TENANT_ID       |
| `VITE_DEFAULT_WORKSPACE_ID`            | `apps/web`                                      | `default_workspace`                                             | OSS fallback workspace id; must match backend DEFAULT_WORKSPACE_ID |
| `LOG_LEVEL`                            | All services                                    | `debug`                                                         | Controls structured logging verbosity.                             |
| `AI_MODEL_PROVIDER`                    | `@corely/api`                                   | `openai`                                                        | Selects `openai` or `anthropic` for Copilot tool runs.             |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | `@corely/api`                                   | `(redacted)`                                                    | Provider credentials for assistant/tool calls; keep secret.        |
| `EMAIL_PROVIDER`                       | `@corely/api`                                   | `resend`                                                        | Controls transactional email adapter.                              |
| `WEB_PORT`, `API_PORT`, `MOCK_PORT`    | Apps/services                                   | `5173`, `3000`, `4000`                                          | Override ports when composing services locally.                    |

## Scripts

Common scripts include:

- `pnpm dev` – builds shared packages and runs all services/apps in parallel.
- `pnpm dev:web`, `pnpm dev:mock`, `pnpm dev:api`, `pnpm dev:worker`, `pnpm dev:api:debug` – start each surface individually (defaults to OSS).
- **Edition-specific dev:**
  - `pnpm dev:api:oss`, `pnpm dev:web:oss` – explicitly run OSS edition (single-tenant).
  - `pnpm dev:api:ee`, `pnpm dev:web:ee` – run EE edition (multi-tenant, requires EE packages).
- `pnpm build`, `pnpm build:web`, `pnpm build:api` – compile packages plus apps/services.
- **Edition-specific builds:**
  - `pnpm build:oss` – build OSS edition only (excludes `/ee` packages).
  - `pnpm build:ee` – build EE edition with all packages.
  - `pnpm --filter './ee/**' build` – build EE packages only.
- `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm format:check` – workspace-wide quality gates.
- `pnpm check` – `lint` + `typecheck`.
- `pnpm prisma:migrate`, `pnpm prisma:generate` – keep Prisma schema in sync for `@corely/data`.
- `pnpm ci:verify-oss-no-ee` – verify OSS builds without `/ee` directory (CI check).

## Development modes

- **Mock-first / UI-first:** `apps/web` (and `apps/pos`) call `services/mock-server`. Mock middleware simulates latency/pagination, enforces idempotency, and exposes assistant tool endpoints, so UI work keeps moving before backend features land.
- **Full backend stack:** `services/api` uses NestJS guards, Prisma, the outbox table, and idempotency ports; `services/worker` publishes outbox events, retries process managers, and powers integrations. `packages/data` owns the Prisma client and repositories.

## Built in public

- Progress lives in docs such as `docs/IMPLEMENTATION_SUMMARY.md`, `CODE_SHARING_ANALYSIS.md`, and the per-domain status notes (`ACCOUNTING_CORE_STATUS.md`, `POS_IMPLEMENTATION_STATUS.md`). Watch those for what is happening now.
- Contributors can help by picking tasks from the implementation docs, updating the mock server when new contracts arrive, or improving module guides (`docs/MODULE_IMPLEMENTATION_GUIDE.md`, `docs/MODULE-TEMPLATE.md`).
- Large changes start with an issue describing the intent; small PRs that include updated tests/docs are most welcome.

## How to add a new module

1. **Contracts first:** add Zod schemas, enums, and tool definitions inside `packages/contracts/src/<module>` so web, POS, API, and worker share the surface.
2. **Backend module:** create `services/api/src/modules/<module>` folders with domains, use cases, DTOs, and Nest controllers that depend only on ports/adapters.
3. **Data nor cross-writes:** add migrations under `packages/data/prisma/schema/` and let repositories in `packages/data/src` own DB writes; no other module touches those tables directly.
4. **Frontend module:** mirror the module in `apps/web/src/modules/<module>` (screens, hooks, routes) and point to the shared contracts plus the HTTP client.
5. **Mock routes:** register UI-first routes/seeds in `services/mock-server/src/routes` so the mock server stays up to date.

Keep the boundaries: API modules use ports/interfaces, the worker only publishes the module’s events, and clients never import backend internals.

## Contributing

- Open an issue for any larger initiative so maintainers can track scope before code.
- Small, focused PRs that pass `pnpm lint`, `pnpm typecheck`, and relevant tests get reviewed faster.
- Update docs or `docs/IMPLEMENTATION_SUMMARY.md` when you touch workflows, contracts, or module behavior.
- Code style follows the shared configs (`eslint.config.js`, `prettier.config.js`). Run `pnpm format` and `pnpm lint:fix` when you add or move files.
- See `CONTRIBUTING.md` for setup, DCO sign-off, and review expectations. Community standards live in `CODE_OF_CONDUCT.md`.

## Security

Please follow `SECURITY.md` for private reporting and response expectations. Placeholder contact: **<SECURITY_EMAIL>**.

## Roadmap

Subject to change.

- Module registry and pack metadata so teams can enable restaurant/hotel/factory workflows with one settings switch.
- Workflow editor integration that composes use-case graphs for approvals, approvals, and multi-step automations.
- POS offline build-out: queue durability, shift sessions, floor plan workflows, and manager approvals.
- AI Copilot improvements: richer tool cards, assistant run auditing, and more deterministic apply/dismiss flows.
- Vertical pack work: kitchen display flows, room folio billing, manufacturing BOM routing, and pack-specific migrations.
- Observability upgrades: structured logs with trace IDs, read-model telemetry, and outbox monitoring dashboards.
- Marketplace for connectors (webhooks, real-time adapters) that plug into the outbox/worker automation surface.

## License

Corely Community is licensed under **AGPL-3.0-only**. Enterprise Packs are commercial and distributed separately. Trademarks are governed by `TRADEMARKS.md`.
See `LICENSE` and `docs/licensing.md` for details.

## Acknowledgements

Built on Vite, React, NestJS, Prisma, BullMQ, and XState along with the ideas documented in `docs/architect.md` and `docs/overall-structure.md`.
