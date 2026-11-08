# Connected apps on the existing modular monolith

2026-11-07 · Product boundary targets plus an inspected implementation map.
[Strategy](../products/corely/README.md) owns positioning;
[alignment](../products/corely/repository-alignment.md) owns inspection evidence;
[BOUNDARIES](BOUNDARIES.md) and [persistence policy](DATABASE_PERSISTENCE_STRATEGY.md)
remain engineering constraints. No runtime changes are approved by this document.

## Five concepts, different purposes

| Concept          | Purpose                                                                                                                           | Does not imply                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Platform         | Shared identity, tenant/workspace context, authorization, documents, notifications, audit, integrations, background execution, AI | Another orchestration platform or duplicate shared services |
| Product app      | Recognizable user capability, e.g. Tasks, People, Expenses                                                                        | One bounded context per marketing name                      |
| Domain module    | Business rules and records owned behind public interfaces                                                                         | Its own service or physical schema                          |
| Surface          | Deployed client or entry point under `apps/*`                                                                                     | Every app needing a frontend deployment                     |
| Customer package | Focused outcome assembled from capabilities                                                                                       | Subscription, database, or code fork per app                |

The 32-app map is neither the current domain inventory nor a delivery commitment.
Its IDs are discussion order; keep runtime IDs, routes, schemas and tables stable.
Historical “1000+ modules” language is scalability context. Continue using domain
bucket schemas, extension storage for small modules, and architectural approval
for heavy-module schemas. No schema-per-app policy is introduced.

## Existing composition infrastructure

The [manifest schema](../../packages/contracts/src/platform/app-manifest.schema.ts)
already describes dependencies, capabilities, permissions, menu contributions,
entitlement metadata, and surface/vertical targeting. Reuse it rather than
introducing a parallel registry for product names.

Current flow, verified by source inspection:

1. [AppRegistry](../../services/api/src/modules/platform/infrastructure/registries/app-registry.ts)
   loads static module manifests; a manifest is not proof of a complete journey.
2. [EnableAppUseCase](../../services/api/src/modules/platform/application/use-cases/enable-app.usecase.ts)
   resolves dependencies, upserts tenant installations and records an audit event.
3. [TenantEntitlementService](../../services/api/src/modules/platform/application/services/tenant-entitlement.service.ts)
   intersects enabled installations with the effective enablement map from
   platform entitlements. Installation and feature configuration are distinct.
4. [GetWorkspaceConfigUseCase](../../services/api/src/modules/platform/application/use-cases/get-workspace-config.usecase.ts)
   resolves experience/capabilities, checks workspace access, ensures default app
   installations, and calls menu composition with permission/surface context.
5. [MenuBuilderService](../../services/api/src/modules/platform/application/services/menu-builder.service.ts)
   filters contributions by enabled apps, scope, surface/vertical, capabilities,
   permissions, and overrides.
6. Shared frontend workspace configuration/sidebar code renders the result and
   post-filters capabilities; route guards provide additional client checks.

See [tenant features/menu detail](../platform/tenant-features-and-menu-permissions.md).
Existing [menu tests](../../services/api/src/modules/platform/__tests__/menu-builder.service.spec.ts)
cover visibility cases; they were inspected, not executed in this documentation task.

## Controls that must remain separate

| Control                | Meaning                                                       | Current evidence / limit                                                                     |
| ---------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Tenant app enablement  | Installation and effective feature configuration for a tenant | Platform registry/install/entitlement services; does not confer user authority               |
| Workspace capabilities | Which operations fit this workspace kind/experience           | Workspace template and experience resolver; a capability key alone is not an implemented app |
| Product subscriptions  | Commercial plan, trial, usage and billing state               | `billing` and `platform-entitlements`; not a one-subscription-per-catalog-app decision       |
| User permissions       | Grants for the actor and role context                         | Identity permission catalogs and workspace-config controller                                 |
| Backend authorization  | Enforcement on an actual read/write and its owned records     | Must check each endpoint/use case; not established globally by menu filtering                |

**Menu visibility is not authorization.** Neither a frontend guard nor a manifest
permission list proves backend enforcement. See the Booking findings in alignment.

Do not collapse tenant and workspace boundaries. Public requests must use trusted
server resolution of host/slug and publish/module checks. The existing
[PublicWorkspaceResolver](../../services/api/src/shared/public/public-workspace.resolver.ts)
resolves stored workspace authority; never derive authority from an untrusted
client tenant ID. Header/proxy trust and per-record scoping still need review.

## Target record ownership and actual candidates

These are target product boundaries, not declarations that all modules exist.

| Product relationship                         | Target rule                                                                                                             | Actual owner/candidate and discrepancy                                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tasks / Projects                             | Projects organizes the same employee-facing tasks                                                                       | No employee Tasks/Projects owner found. Workflow `Task` executes processes; CRM `Activity` and portfolio projects have other semantics.                           |
| People / identity / party / resources        | Employees, auth accounts, customers/parties and bookable resources are related but distinct                             | Identity, party and Booking exist; no dedicated employee working-pattern/absence owner found.                                                                     |
| People / Shifts / Appointments               | People supplies authorized working/absence information; Shifts plans coverage; Booking validates reservations/occupancy | Booking availability/resources exist; staff coverage and absence-to-resource connections are targets. Keep internal reservations distinct from customer bookings. |
| Requests / business domains / Workflows      | Requests owns submissions/decisions; domain owns validation/application; Workflows orchestrates broader processes       | Forms and approvals services plus workflow infrastructure exist; a composed absence/decision journey is not established.                                          |
| Assets / Maintenance                         | Equipment assignment/lifecycle differs from servicing/work orders                                                       | Inventory is a reuse candidate, not evidence of either complete app.                                                                                              |
| Knowledge / documents / Contracts / Learning | Approved content differs from stored files, obligations and completion records                                          | Documents, CMS/website, coaching contracts and classes are adjacent owners; do not relabel them as complete catalog apps.                                         |
| Vendors                                      | Supplier master data stays with party; purchasing references it                                                         | Existing `party` supplier navigation and `supplierPartyId` records.                                                                                               |
| Finance / Accounting / Financing             | Finance is umbrella; bookkeeping differs from funding administration                                                    | Accounting exists; no Financing owner found in reviewed scope.                                                                                                    |

Connect by stable IDs and public contracts/ports; use outbox events for asynchronous
coordination. Proposed absence events are illustrative. Do not create parallel
identities, bookings, approvals, documents, customers, suppliers or permissions.

## Financial distinctions

- `billing` manages SaaS subscriptions; `invoices` owns customer invoicing and
  `purchasing` owns vendor bills. Sharing a Prisma bucket does not merge ownership.
- `payment-methods` configures bank/payment methods; invoice/bill payment records
  and provider adapters do not establish a full Payments product.
- `cash-management` owns registers, entries and day close; this is not a cash-flow
  forecasting system. Forecasts need reliable sources, freshness and assumptions.
- Existing financial code is retained. Optional adoption and deferred broad new
  accounting investment do not remove current integrations or deterministic postings.

## Surfaces and reusable UI

The [focused-surface ADR](../decisions/ADR-0003-focused-app-surfaces.md) and
[current inventory](focused-app-surfaces-inventory.md) record the maintainer's
approved App Center + Invoice first, then HR surface plan. The accepted hosts
are `app.corely.one`, `invoice.app.corely.one` and `hr.app.corely.one`, with
legacy traffic retained until gated cutover. This does not change the selected
OpenBuk operational pilot or promote conditional invoice business expansion.

Prefer an existing surface for the focused package unless a separately reviewed
need justifies another. Reuse `packages/ui` primitives, `packages/web-shared`
providers/clients/layout and `packages/web-features` public feature exports.
Never fork a focused package or import another app’s private screens. Keep
business rules in owning application use cases and shared schemas in contracts.

[CRUD conventions](../frontend/crud-ui-standard.md) still apply to record editing.
Calendars, task boards, decision inboxes, daily views and employee self-service
are valid target entry points, not claims of existing screens. Public booking
may be essential to an internal-operations outcome and must be preserved.

## AI and execution

Reuse existing Copilot tooling and API-hosted background execution. The target
flow is authorized request → permission-filtered context → structured proposal
→ deterministic validation → required approval → application use case execution
→ audited result. Follow the [AI policy](../ai/ai-copilot.md); existing configured
deterministic automation policies are a separate category. This product model
introduces neither new execution infrastructure nor an audited-control guarantee.
