# Corely architecture

**Version:** 1.3 (product framing alignment)

**Date:** 2026-11-07 (technical foundation originally documented 19 Mar 2025)

**Scope:** Kernel + module domains (accounting, sales/purchasing, inventory, workflows, AI, POS, web admin).

---

## Intent

Corely is a collection of connected, AI-native apps for running a team’s
internal operations. Teams start with the capabilities they need and expand
into finance and specialist operations as their work demands.

Retain the modular monolith, DDD boundaries and hexagonal layering. PostgreSQL +
Prisma back the transactional core, with queue adapters and an outbox for background
execution. Finance is optional; accounting is not an operational prerequisite.
A product app is not necessarily a domain module, surface, schema or subscription.
See [connected-app composition](connected-apps.md), [product strategy](../products/corely/README.md)
and [current repository evidence](../products/corely/repository-alignment.md).

The proposed focus is one operational package with Schedule, Team and Daily Work,
not a 32-app rewrite. Segment and adoption model remain hypotheses. Technical rules
below are constraints/targets where stated; this document is not a universal
implementation or operational-readiness audit.

---

## Runtime surfaces

- **Web (`apps/web`, Vite + React):** Admin/backoffice UI. Uses TanStack Query with backoff from `@corely/api-client`, workspace + auth providers, and an offline provider backed by `@corely/offline-web` (IndexedDB cache + outbox; transport is still a placeholder).
- **Public Web (`apps/public-web`, Next.js App Router):** Public-facing UI for portfolios, rentals, blog, and CMS pages. Uses the public API surface under `/public/*` and is deployed as a server-rendered app (no SPA rewrite required).
- **POS (`apps/pos`, Expo + React Native):** Offline-first shell wired to `@corely/offline-core`, `@corely/offline-rn`, and `@corely/pos-core`.
- **Corely Cash (`apps/cash-management`, Vite + React):** Dedicated admin app for cash-management workflows (registers, entries, day close, cashbook exports). Uses shared packages `@corely/web-shared` and `@corely/web-features`.
- **API (`services/api`, NestJS 11):** Modules for identity, accounting, sales, purchasing, inventory, approvals, engagements, workflows, AI copilot, etc. Global env validation via `@corely/config`, Prisma-powered `DataModule`, and trace-ID middleware.
- **Background runtime (`services/api/src/modules/background`, NestJS 11):** API-hosted internal execution path for outbox processing, scheduled runners, and workflow queue handlers. Cloud Scheduler and Cloud Tasks target internal API endpoints instead of a separate service.
- **OpenBuk (`apps/openbuk-web`, Vite + React):** Focused booking product with marketing/auth/studio/public journeys, using the existing Booking API and records.
- **Other surfaces:** freelancer, CRM, portal, restaurant-listing and landing (Vite); website-runtime (Next.js); ERiC gateway (.NET). See the alignment inventory.
- **Historical mock server:** `services/mock-server` has no tracked runtime/package in this commit; do not assume it starts.

---

## Monorepo layout (selected)

- **apps/**: multiple clients listed above plus `e2e` (tests, not a product)
- **services/**: `api`; background is nested under API modules
- **packages/**:
  - `contracts`: shared schemas/enums/events/tool cards (accounting, CRM, expenses, invoices, inventory, pos, purchasing, sales, tax, workflows, AI contexts, queues)
  - `kernel`: BaseUseCase, Result helpers, DI tokens, core ports (UoW/outbox/audit/idempotency/queue/observability), time helpers, test fakes
  - `domain`: shared errors + customization primitives
  - `data`: Prisma `DataModule` (UoW + outbox/audit/idempotency adapters, shared repositories)
  - `core`: workflow engine (xstate-backed) used by workflow modules
  - `api-client` / `auth-client`: HTTP client with retry/idempotency headers + auth helpers
  - `offline-core`, `offline-web`, `offline-rn`, `pos-core`: offline/outbox/sync building blocks
  - `prompts`: prompt registry + static prompt definitions for AI

---

## Backend architecture

- **Hexagonal per module:** `services/api/src/modules/*` follow domain → application (ports/use-cases) → infrastructure (Prisma/adapters) → adapters (HTTP/tools) with testkits. See `services/api/src/modules/README.md` for the layout.
- **Composition:** `AppModule` imports modules for identity, party/CRM, workspaces, accounting, sales, purchasing, inventory, approvals, engagement, workflows, automation, reporting, documents, tax, platform, and AI copilot. `RequestContextInterceptor` and the global `SurfaceGuard` are registered; public workspace path middleware applies to routes.
- **Data & transactions:** `@corely/data` exposes a global Prisma UnitOfWork plus outbox, audit, and idempotency adapters. Only repositories talk to Prisma.
- **AI Copilot:** `ai-copilot` module streams chat via `StreamCopilotChatUseCase`, builds tool registries from invoices/party/sales/purchasing/inventory/approvals/engagement, and records tool executions to Prisma + outbox. Prompt registry comes from `@corely/prompts`; observability uses OTEL/Langfuse via `OtelObservabilityAdapter`.
- **Workflows & automation:** Workflow orchestration lives in the API-hosted background runtime (`WorkflowsModule`) with handlers for human/timer/http/email/ai/system tasks and queue adapters (memory/Cloud Tasks selectable via env). Workflow specs and transitions reuse `packages/core`.
- **Outbox & notifications:** The background runtime polls Prisma outbox and triggers handlers such as invoice email delivery via Resend (provider set by env).
- **Error model:** RFC 7807 Problem Details responses; domain errors in `packages/domain/src/errors` (UserFriendly/Validation/Unauthorized/Forbidden/NotFound/Conflict/ExternalService/Unexpected). Stable codes follow `Module:Meaning`.
- **Observability:** `services/api/src/shared/observability/setup-tracing.ts` wires OTLP exporters with optional Langfuse span processor. Sampling and masking are driven by `OBSERVABILITY_*` env vars.
- **Configuration:** `@corely/config` validates env with Zod (DB/Redis/AI/email/storage/observability/auth ports) before bootstrapping modules.

---

## Frontend architecture (web)

- **Providers:** `apps/web/src/app/providers` wires QueryClient (retry/backoff), AuthProvider, WorkspaceProvider, OfflineProvider, and toast/tooltip UI.
- **Modules:** Feature folders under `apps/web/src/modules` mirror backend domains (accounting, sales, purchasing, inventory, expenses, invoices, CRM/customers, assistant, platform/settings, tax, workspaces). Shared UI/components sit in `apps/web/src/shared`.
- **Offline:** `OfflineProvider` persists React Query cache to IndexedDB and runs `SyncEngine` (outbox + network monitor + local lock). Transport is currently a placeholder; workspace tracking is already wired.
- **API integration:** `@corely/api-client` adds idempotency and correlation headers plus retry with exponential backoff; web uses shared error mappers/toasts for consistent UX.

---

## POS shell

- Expo Router entrypoint with dependencies on `@corely/offline-core`, `@corely/offline-rn`, `@corely/pos-core`, `@corely/api-client`, and `@corely/auth-client`.
- Uses SQLite + SecureStore via offline packages for queued commands and sync once transport endpoints are wired.

---

## Corely Cash (Cash Management)

- Dedicated Vite + React application (`apps/cash-management`) focused exclusively on cash-management workflows (registers, entries, day close, cashbook exports).
- Shares the same API and authentication environment as the main web app (`apps/web`).
- Composes UI and business logic from shared packages: `@corely/web-shared` (providers, layout, infrastructure) and `@corely/web-features` (routes and screens).

---

## Boundary rules

1. Domain logic stays in shared packages or module `domain/` folders (no Nest/React imports).
2. Only repositories access Prisma; app/services depend on ports, not implementations.
3. Modules communicate via contracts/events/outbox—not direct table writes.
4. API enforces auth/validation/idempotency/trace IDs per request; background handlers reuse the same ports.
5. Web/POS consume `@corely/contracts` and clients; they never import backend internals.

**Full documentation:** See `docs/architecture/error-handling.md` for complete reference, testing patterns, and troubleshooting.

---

# Cross-platform sharing strategy (Web + React Native)

Web and POS are distinct client surfaces, but they share the same contracts, domain vocabulary, and workflow boundaries. Avoid duplicating business workflows across clients.

**Shared (packages):**

- `packages/contracts`: Zod schemas + request/response types (single source of truth).
- Shared API client behavior (auth, tenant scoping, idempotency, error normalization) via `apps/web/src/lib/api-client.ts` and aligned patterns in RN.
- Shared domain workflows where applicable: use-case orchestration lives in API; clients reuse the same contract shapes and command semantics.
- AI copilot tool schemas and tool-card payloads (shared types, stable outputs).

**React Native specific:**

- Device APIs (camera/scan), local storage, background sync triggers.
- Offline queue persistence via `packages/offline-rn`.
- POS navigation and touch-first UI primitives.

**Web specific:**

- Browser storage and backoffice layouts/dashboards.
- Admin workflows and reports.

**Rule:** app composition stays in `apps/*`; reusable UI/features use public exports from `packages/ui`, `packages/web-shared`, and `packages/web-features`. Shared domain, contracts, and client behavior stay in packages. Never import another app’s private screens.

---

# POS offline-first architecture (React Native)

The POS client is **offline-first** by design. It must complete sales flows even when connectivity is intermittent.

Core concepts:

- **Register / Shift session:** scoped session for a device/cashier with opening/closing control.
- **POS ticket (draft):** editable cart state; not yet a sale.
- **POS sale (syncable transaction):** immutable local transaction created on finalize; queued for sync.

Sync behavior:

- POS queues commands locally using `packages/offline-rn`.
- Commands are **idempotent** with deterministic server responses.
- Conflict handling is explicit: reject with an actionable error; never silently drop or merge.
- When online, sync posts to Sales/Accounting through API use cases (single system of record).

---

# Multi-tenancy, security, and customization

**Tenant isolation requirement:** preserve actual tenant/workspace ownership; scope data access, uniqueness and indexes appropriately. Sensitive actions require audit logs. Current coverage is not universally verified; see alignment discrepancies. Public authority comes from trusted workspace resolution, not a client tenant ID.

**Authorization:** RBAC by default, optional ABAC policies for high-precision rules (e.g., amount thresholds).

**Customization strategy:** configuration first (custom fields, statuses, numbering, templates) + workflow definitions; only use code-level packs when you must add screens, integrations, or specialized data structures.

## Customization levels

| Level                 | Examples                                                    | Storage                                     |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| Config-only (no-code) | Custom fields, labels, numbering, tax rules, roles          | TenantSetting + CustomFieldDefinition/Value |
| Workflow (low-code)   | Approvals, kitchen routing, reorder points, scheduled tasks | WorkflowDefinition JSON + instances + tasks |
| Extension pack (code) | POS modifiers, hotel room allocation, factory BOM/QA        | Module pack with migrations + tools + UI    |

---

# Historical domain design reference (not current inventory)

The table below preserves the earlier ERP domain design vocabulary. It mixes
implemented domains and proposed ones (e.g. Assets, operational Projects, light HR);
it is neither the current module inventory nor the product catalog. Use the
[alignment inventory](../products/corely/repository-alignment.md) for current owners.
Product names do not require matching bounded contexts, migrations or schemas.
Follow the unchanged [persistence policy](DATABASE_PERSISTENCE_STRATEGY.md).

| Module domain             | Purpose                                             | Core entities (examples)                           |
| ------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Identity & Access         | Tenants, users, roles, policies, API keys.          | Tenant, User, Membership, Role, Permission, ApiKey |
| Party & CRM               | Customers, suppliers, employees, contacts.          | Party, PartyRole, ContactPoint, Address            |
| Catalog                   | Products/services, pricing, tax, units.             | Item, Variant, PriceList, TaxCode, Unit            |
| Documents                 | Receipts, contracts, attachments, OCR metadata.     | Document, File, DocumentLink                       |
| Sales (AI-native)         | Quote-to-cash pipeline with AI drafts + postings.   | Quote, SalesOrder, Invoice, Payment, PostingLink   |
| Purchasing (AI-native)    | Procure-to-pay pipeline with AI drafts + postings.  | PurchaseOrder, VendorBill, BillPayment, Mapping    |
| Billing & Payments        | Invoices, payments, refunds, allocations.           | Invoice, InvoiceLine, Payment, Allocation, Refund  |
| Accounting Core           | Chart of accounts and journal postings.             | LedgerAccount, JournalEntry, JournalLine           |
| Expenses                  | Employee/vendor expenses and approvals.             | Expense, ExpenseLine, ReceiptLink, Approval        |
| Inventory                 | Stock ledger, reservations, reorder rules.          | Location, StockMove, Reservation, ReorderPolicy    |
| POS / Register            | Register sessions and offline sales sync.           | Register, ShiftSession, PosTicket, PosSale         |
| Assets & Maintenance      | Equipment lifecycle and servicing.                  | Asset, MaintenanceTask, WorkOrder                  |
| Projects & Jobs           | Job costing and time/material tracking.             | Project, Job, TimeEntry, CostAllocation            |
| HR (light)                | Profiles, time off, shifts (optional).              | EmployeeProfile, LeaveRequest, Shift               |
| Workflows                 | State machines, approvals, tasks.                   | WorkflowDefinition, WorkflowInstance, Task         |
| Automation & Integrations | Webhooks, connectors, outbox, retries.              | Integration, Webhook, OutboxEvent, Delivery        |
| AI Copilot                | Tool registry, runs, messages, tool execution logs. | AgentRun, Message, ToolExecution, Attachment       |
| Reporting                 | Dashboards, analytics, exports.                     | ReadModels, Snapshots, MaterializedViews           |

---

# AI-native revenue + expense flows

Target behavior: Copilot proposes structured drafts for quotes, orders and bills;
deterministic application logic validates, and authorized users approve sensitive
AI-originated changes. Existing configured deterministic posting rules are separate:
for example, purchasing settings include auto-post controls and posting requires
account mappings. Do not disable those policies by prose or claim every current
mutation is user-confirmed. Optional finance is a product-adoption target, not
removal of existing ledger integrations. See [AI policy](../ai/ai-copilot.md).

# AI copilot for Web and POS

We use the existing **ai-copilot** module and **ai-sdk.dev** tool-calling patterns. Web and POS both render
the same tool cards and apply actions explicitly.

Target rules (coverage must be checked per tool/use case):

- AI proposes structured actions (tool cards); permission-filter context first.
- Cashier/user must confirm apply actions.
- AI never finalizes a sale, never posts inventory moves.
- All AI interactions are logged (confidence, provenance, accepted/dismissed).

---

# Vertical packs (restaurant, hotel, factory)

Vertical packs extend the kernel and baseline modules with specialized workflows, UI, and data structures. They should be **additive and isolated**: new records follow existing domain buckets/extension storage and architectural approval rules, while shared primitives remain in the kernel. We ship a baseline POS v1 in `apps/pos` (generic quick sale); packs later extend it for hospitality/retail flows.

| Pack                    | Adds (examples)                                                    | Composes kernel primitives                      |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Restaurant POS          | Floor plan, table checks, modifiers, kitchen tickets, cash drawer. | Location(TABLE), Order, Item, Payment, Workflow |
| Hotel Ops               | Room inventory, reservations, check-in/out, folio billing.         | Location(ROOM), Party, Order/Invoice, Workflow  |
| Factory / Manufacturing | BOM, work orders, routing, QA, batch tracking.                     | Item, Inventory, Asset, Workflow, Domain Events |

## POS minimum build (restaurant pack)

- Screens: floor plan, table order entry, payment/close, optional kitchen display
- Realtime: broadcast `OrderOpened/Updated/SentToKitchen/Paid` events to connected devices
- Safety: manager approvals for voids/discounts; idempotency on pay/close

---

# Operational readiness

**Observability:** structured logs with correlation IDs (`tenantId`, `requestId`, `traceId`), metrics (latency, error rate), and tracing across API/background processing. Persist tool execution logs for Copilot runs.

**Data safety:** backups + PITR, migration discipline (expand/contract), and strict CI checks (`prisma validate`, drift checks).

**Deployments:** keep infra simple: one Postgres, one Redis, one object store. Deploy web separately from the API so you can scale POS traffic independently from automation workloads.

| Area        | Baseline                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| CI/CD       | Lint + tests + `prisma validate`; migration PR checks; seed scripts for packs. |
| Security    | RBAC/ABAC, audit log, secrets management, encrypted storage for files.         |
| Performance | Read models for dashboards; caching for menus/POS; indexes include `tenantId`. |
| Reliability | Outbox + retries; idempotency; dead-letter queue; incident playbooks.          |

---

# Appendix: governance rules for a growing team

1. **Module ownership:** every module has an owner; only owners approve cross-cutting changes.
2. **No shared DB writes:** a module writes only its own tables; other modules integrate via API/events.
3. **Contracts are versioned:** breaking changes require a deprecation window.
4. **Events are stable:** treat domain events as public APIs; add fields, do not rename/remove lightly.
5. **Keep the kernel small:** promote something into kernel only when at least two packs need it.
6. **Cross-platform contracts:** Web + POS consume versioned contracts; no client-specific wire formats.
7. **Shared client behavior:** auth/idempotency/error mapping lives in shared client patterns.
8. **Offline queue stability:** queued command semantics remain backward compatible.
9. **Tool-card schemas are public APIs:** Web + POS share tool definitions and card payloads.

> This foundation is intentionally practical: strong enough for enterprise needs, while avoiding early microservice overhead. When parts grow (integrations, reporting, POS realtime), these boundaries let you extract services safely.
