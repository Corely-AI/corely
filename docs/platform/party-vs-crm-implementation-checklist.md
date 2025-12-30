# Party vs CRM Implementation Checklist

## Step-by-step tasks

1. Create new backend modules:
   - `services/api/src/modules/party` for Party entities and `/customers` API
   - `services/api/src/modules/crm` for deals/activities/pipeline and `/crm/*` API
2. Move Party domain + application code:
   - Party aggregates, repos, and customer use cases from `party-crm` -> `party`
   - CustomerQueryPort should live in `party` and be implemented there
3. Move CRM domain + application code:
   - Deal, Activity, PipelineConfig, timeline use cases from `party-crm` -> `crm`
4. Update module wiring:
   - `services/api/src/app.module.ts` imports `PartyModule` and `CrmModule`
   - Sales, invoices, engagement, and ai-copilot depend on `PartyModule` only
5. Contracts alignment:
   - Keep `packages/contracts/src/customers` stable
   - Introduce `packages/contracts/src/party` (or keep `crm/party.types.ts` but re-export from `party`)
   - Add re-export shims to avoid breaking imports
6. RBAC:
   - Add permission catalog entries for `party.*` and `crm.*`
   - Add `RbacGuard` and `RequirePermission` to party/crm controllers
   - Provide temporary alias mapping for `read:customers`/`write:customers`
7. Menu and entitlements:
   - Add CRM menu entries in `apps/web/src/modules/registry.ts` or app manifests
   - Keep Customers menu intact
   - If app manifests are used, create `party`/`customers` and `crm` manifests
8. Compatibility wrappers:
   - Optionally keep `PartyCrmModule` as a temporary wrapper that re-exports new modules

## Do-not-break constraints

- Keep route prefixes: `/customers` and `/crm/*`
- Keep `customers` appId stable
- Preserve existing DTOs and contracts
- Maintain tenant scoping on all queries/mutations
- Avoid cross-module DB writes (CRM should not own Party mutations)

## Test plan

- API:
  - RBAC denies unauthorized actions for party + crm
  - Tenant scoping enforced on customers, deals, activities, timeline
  - Route compatibility: old endpoints still respond
- UI:
  - Customers menu and routes still render
  - CRM menu (if enabled) respects permissions/entitlements
- DB:
  - Migrations apply cleanly (no schema rename in Phase 1)
  - No orphaned references for `partyId`
- Contracts:
  - Backward compatibility for `customers` and `crm` DTOs
