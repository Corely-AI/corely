# ADR-0001: party-crm Boundary Decision

## Context

The backend module `services/api/src/modules/party-crm` currently owns both party (customers, contact points, roles, addresses) and CRM (deals, activities, pipeline) concerns. Multiple other domains reference `customerPartyId` or call into customer query ports. The UI already splits navigation and routes between `/customers` and `/crm/*`, but the backend module is still monolithic. There are no app manifests or RBAC permissions defined for party/crm yet, and party-crm controllers only use `AuthGuard`.

## Findings

### Module and routing inventory

| Area       | Location                                        | Public name (UI) | Route prefix        | Permission namespace            | Menu composition                  |
| ---------- | ----------------------------------------------- | ---------------- | ------------------- | ------------------------------- | --------------------------------- |
| API module | services/api/src/modules/party-crm              | N/A              | /customers, /crm/\* | none (AuthGuard only)           | N/A                               |
| API schema | packages/data/prisma/schema/45_party_crm.prisma | N/A              | N/A                 | N/A                             | N/A                               |
| Contracts  | packages/contracts/src/customers                | Customers        | N/A                 | none                            | N/A                               |
| Contracts  | packages/contracts/src/crm                      | N/A              | N/A                 | none                            | N/A                               |
| Web module | apps/web/src/modules/customers                  | Customers        | /customers          | read:customers, write:customers | moduleRegistry includes customers |
| Web module | apps/web/src/modules/crm                        | N/A              | /crm/\*             | none                            | not in moduleRegistry             |

### Concept ownership map

- Party (tier 0): Party, PartyRole, ContactPoint, Address, identity/contact data, merge/dedupe potential
- CRM (tier 2): Deal, Pipeline/Stage config, Activity, Timeline
- Mixed/unclear: Activity notes could be shared in future, but currently only CRM use cases and routes exist

### Dependency graph (imports, ports, and usage)

- Sales -> Party (uses CustomerQueryPort from party-crm)
- Invoices -> Party (PartyCrmModule + CustomerQueryPort)
- Engagement -> Party (customer search tools use PartyCrmApplication)
- AI Copilot -> Party (customer tools use PartyCrmApplication)
- POS -> Party (TODO: customer validation)
- CRM -> Party (deals/activities reference partyId)
- Party -> CRM (none found)

### Database ownership and cross-module FKs

Owned by party-crm:

- Party, PartyRole, ContactPoint, Address (Party)
- Deal, DealStageTransition, Activity, PipelineConfig (CRM)

Cross-module foreign keys into Party:

- None declared in Prisma schemas
- Multiple modules store `partyId`/`customerPartyId` as opaque IDs (inventory, sales, invoices, engagement, pos) without FK constraints

### Compatibility surface

- API routes: `/customers`, `/crm/deals`, `/crm/activities`, `/crm/timeline` are already in use
- Web routes: `/customers/*`, `/crm/*`
- UI menu: Customers appears in `apps/web/src/modules/registry.ts`; CRM does not
- RBAC: party-crm controllers do not use `RbacGuard` or permission keys; UI uses `read:customers`/`write:customers` but these are not defined in the permission catalog
- App manifests: only `invoices` exists and declares dependency on `customers`; no `party-crm` or `crm` appId found

## Options considered

1. Rename `party-crm` -> `crm`
2. Split into `party` + `crm` bounded contexts
3. Keep `party-crm` as-is and plan a later split

## Decision

Split into two bounded contexts:

- `party` (tier 0 shared kernel) owns Party, PartyRole, ContactPoint, Address, and customer CRUD
- `crm` (tier 2 revenue engine) owns Deal, Activity, PipelineConfig and depends on Party via `partyId`

## Consequences

- Party becomes a shared kernel depended on by sales, invoices, engagement, and crm
- CRM can evolve independently without coupling party ownership
- Requires new permission namespaces and app manifests for menu/entitlement alignment

## Migration plan + compatibility strategy

- Phase 1 (logical split, no DB renames):
  - Re-home Party repositories, use cases, and `/customers` controllers into a new `party` module
  - Re-home CRM repositories, use cases, and `/crm/*` controllers into a new `crm` module
  - Keep Prisma tables unchanged in `45_party_crm.prisma` for now
- Contracts:
  - Keep existing `customers` contracts stable; move `crm/party.types.ts` to `party` contracts later with re-export aliases to avoid breaking imports
- App IDs:
  - Keep `customers` appId stable (already referenced by invoices manifest)
  - Introduce `crm` appId for the CRM module; no `party-crm` appId found, so do not create one
- Routes:
  - Preserve `/customers` and `/crm/*` paths; no breaking API changes
- RBAC:
  - Add `party.*` and `crm.*` permissions; provide alias mapping from `read:customers`/`write:customers` to new party keys until UI is updated

## Risks + mitigations

- RBAC drift: add permission catalog entries + controller guards before enabling app manifests
- Hidden dependencies: run ripgrep checks for `party-crm` imports during split
- Contract import breaks: use re-export aliases and deprecation notes

## Rollback strategy

- Keep `party-crm` module as a thin compatibility wrapper that re-exports `PartyModule` and `CrmModule` providers/routes during migration
- Revert module wiring in `services/api/src/app.module.ts` if needed without DB changes
