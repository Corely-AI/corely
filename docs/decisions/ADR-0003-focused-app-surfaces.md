# ADR-0003: Focused App Center, Invoice and People surfaces

## Status and scope

2026-11-08 · **Proposed for platform, security and product review.**
Deliverable for [SURF-01 / #381](https://github.com/Corely-AI/corely/issues/381),
under [#380](https://github.com/Corely-AI/corely/issues/380). Approval of this ADR
and its host/callback matrix is still required; no approval, identity registration,
domain move or deployment is asserted by this document.

The [current-source and backlog inventory](../architecture/focused-app-surfaces-inventory.md)
records evidence at `development` commit
`3a3492196497d38da088b5222b96cd42bd01ad21`, live issue/PR reconciliation and
bounded public-host observations. Older product inventories remain historical.

## Context

Corely already has focused clients and public feature exports, a shared modular
API, manifest-based app configuration and People implementation. The requested
change is independent business navigation and central sign-in across selected
browser origins. Existing `apps/portal` serves students/guardians with its own
authentication; it is not an unused App Center.

The documented legacy `app.corely.one` entry currently responds with the Corely
application title. Rebinding that entire host to a launcher would risk existing
routes, bookmarks and auth state. DNS resolution of the requested Invoice/HR
hosts does not establish usable TLS or a deployed focused app.

## Proposed decision

1. Validate **App Center + Invoice first**, using existing invoice behavior as the
   cross-app navigation/session proof. HR is a second reuse proof over People.
   This surface sequence does not replace the Schedule/Team/Daily Work pilot or
   promote the conditional invoice business roadmap in #295/#353–356.
2. Add thin `apps/app-center`, `apps/invoice` and, in the second wave, `apps/hr`
   clients. Each composes public `@corely/web-features` exports and shared
   `@corely/web-shared` providers/clients/layout and `@corely/ui` primitives.
   Do not import another app's private screens or copy business feature trees.
3. Keep one business backend, `services/api`, and its existing domain owners,
   contracts, persistence adapters and API-hosted background execution.
   Invoice uses runtime **`appId: "invoices"`**; the HR display name uses
   **`appId: "people"`**. Preserve record IDs, permissions, stored installations,
   public routes and events. No HR backend, schema-per-app, new worker or
   catalog-wide frontend scaffolding follows from this decision.
4. Central identity must preserve existing user/membership identities. Prefer
   the chosen issuer's hosted/themed login at `login.corely.one`; create
   `apps/login` only if SURF-02 explicitly justifies a Corely-owned frontend.
   Provider, identity mapping, session storage/operations and migration design
   remain [SURF-02 / #382](https://github.com/Corely-AI/corely/issues/382).
5. New browser surfaces use host-specific server-managed sessions through one
   reusable session/BFF adapter in front of the existing API. It owns transport,
   callback validation and session lifecycle, not invoice/People business rules.
   Hosting/runtime placement is decided in SURF-02/05; no separate business API
   or database per frontend is introduced. Do not copy bearer tokens between
   origins or share a parent-domain bearer-token cookie.
6. Add launch/category metadata to the existing registry/catalog contracts.
   Keep deployed-surface keys separate from domain `appId` values and catalog
   discussion IDs. SURF-03/08 must extend trusted surface resolution and menu
   composition compatibly: retain existing platform/app, POS and CRM behavior.
   Current fallback-to-platform behavior cannot enforce Invoice-only menus.
7. Each focused client has explicit routes and business navigation, **All apps**,
   a shared app switcher and authorized workspace handoff. Invoice may expose
   necessary customer/document/settings interactions without embedding their
   whole apps. HR exposes only existing role-appropriate People journeys.
   Tenant enablement, effective entitlements, workspace capabilities, user grants
   and per-operation backend authorization remain independent controls.

### Request and ownership boundaries

```text
Browser -> selected app origin -> shared session adapter -> existing services/api
                 |                        |                  |
           shared UI/features      chosen central issuer   owning use cases
                                                          / persistence / outbox
```

App Center lists authorized launch destinations; it neither installs apps on read
nor grants access. Browser workspace intent is untrusted: the receiving server
rechecks membership, tenant/workspace scope and operation permissions. Cache keys
include the authorized context; switching/revocation clears private responses and
pending actions. Neutral operational availability does not carry private absence
reasons or personnel attachments. Existing Documents, Party, Identity, Workspaces,
Copilot and audit interfaces remain the owners of supporting capabilities.

## Host and callback matrix for approval

These are **proposed exact registrations**, not an export of an existing issuer
configuration. All callback paths must be handled by the server session adapter
before SPA fallbacks. SURF-02 confirms the protocol/issuer requirements; SURF-04
registers the reviewed URLs. No wildcard callback or arbitrary return URL is allowed.

| Origin                                                                    | Intended owner and rollout                                                                                    | Callback URI                                                                            | Post-logout URI                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `https://app.corely.one`                                                  | New App Center; root changes only at gated cutover; legacy paths retained below                               | `https://app.corely.one/auth/callback`                                                  | `https://app.corely.one/auth/logged-out`         |
| `https://invoice.app.corely.one`                                          | New Invoice client; first wave; `invoices` owner                                                              | `https://invoice.app.corely.one/auth/callback`                                          | `https://invoice.app.corely.one/auth/logged-out` |
| `https://hr.app.corely.one`                                               | New HR client; second wave; `people` owner                                                                    | `https://hr.app.corely.one/auth/callback`                                               | `https://hr.app.corely.one/auth/logged-out`      |
| `https://login.corely.one`                                                | Central identity entry, preferably hosted/themed; provider-specific endpoints decided in SURF-02              | Not an application callback                                                             | Provider-specific; not registered by this ADR    |
| `https://admin.corely.one`                                                | Proposed compatibility alias to retained `apps/web`; verify ownership/binding before use; no new app required | Retain legacy auth initially; any later central callback requires explicit registration | Retain legacy behavior initially                 |
| `https://api.corely.one`                                                  | Existing shared business API; preserve existing clients                                                       | Not a browser login callback                                                            | Not applicable                                   |
| `https://portal.corely.one` and workspace portal URLs                     | Existing `apps/portal`; preserve student/guardian auth and `/w/:slug` URLs                                    | Preserve existing portal contract; no new central callback in this slice                | Preserve portal logout                           |
| Existing CRM, POS, freelancer, cash-management and public/OpenBuk origins | Preserve existing routes and auth; no forced migration                                                        | Inventory actual registrations before any future change                                 | Preserve existing behavior                       |

The compatibility alias is a recommendation requiring the same owner review as
the requested hosts; it has not been probed, provisioned or selected in a provider.
If that alias cannot be approved, keep the current `app.corely.one` binding and
defer its root cutover rather than invent a working fallback origin.

Staging uses separate issuer clients and an isolated API/data environment. Proposed
origins are `https://app.staging.corely.one`,
`https://invoice.app.staging.corely.one`, `https://hr.app.staging.corely.one` and
`https://login.staging.corely.one`. The three application origins reserve their
own exact `/auth/callback` and `/auth/logged-out` URLs as above. They are not
verified hosts. SURF-19 must approve/provision the concrete bindings and TLS;
unapproved origins are never enabled in the issuer.

SURF-18 supplies exact local origins/ports and callback pairs before local SSO
implementation; use separate development clients. Ephemeral preview URLs do not
enter a wildcard allowlist: use a reviewed fixed preview origin or keep SSO off.
Do not assume an `*.corely.one` certificate covers `invoice.app.corely.one` or
`hr.app.corely.one`; verify each hostname's certificate and route.

The concurrent [SURF-02 draft PR #405](https://github.com/Corely-AI/corely/pull/405)
proposes `apps.corely.one`, `invoice.corely.one` and `hr.corely.one` instead,
leaving the legacy app host unchanged. Those are unapproved alternatives to the
parent epic's requested URLs used here. Resolve this topology difference in both
ADRs before either registration set is approved; do not silently register both
sets or infer that the separate identity proposal changes the requested scope.

### Existing `app.corely.one` traffic

Until the migration gates pass, the current origin continues serving the legacy
application, including its root. Preview/cohort App Center access uses a separately
reviewed staging origin; merging this ADR changes no live binding.

At an approved cutover, switch only the root to App Center and retain an explicit
compatibility route map to the retained legacy deployment. Reserve the new
`/auth/callback`, `/auth/logged-out` and `/api/session/*` handlers before any legacy
`/auth/*`, `/api/*` or SPA catch-all. Keep legacy login/reset URLs working during
transition. Do not forward legacy `/api/auth/*` commands into new session handlers.

SURF-15/19 must enumerate the complete legacy route table, not just Invoice:
`/invoices/*`, capability aliases `/sales/invoices/*`, `/people/*`, admin/settings
and existing public journeys. Preserve path, legitimate query intent and fragment
where applicable. Initially serve legacy deep links through the old target;
cohort redirects to Invoice/HR follow only after auth restoration and route
equivalence tests. Legacy `/audit` is not automatically an Invoice destination.
Keep the proposed compatibility alias available for the full legacy UI/root.

The new origin cannot read another origin's legacy localStorage. Re-authenticate
through the selected identity flow; never transfer old bearer tokens in URLs,
postMessage or shared cookies. Preserve existing token APIs for unaffected
clients until SURF-07's reviewed migration and revocation policy replaces them.

## Backlog and implementation order

The [inventory](../architecture/focused-app-surfaces-inventory.md#capability-to-delivery-map)
maps every SURF task and existing Platform/People/Invoices overlap. Do not reopen
or reimplement merged #301/#302/#304/#305–308 to create the new clients.
Keep #303's OpenBuk operational shell separate from the reusable focused shell.
Reuse applicable shared changes; do not replace its pilot acceptance.

1. Review this ADR/host matrix; finish SURF-02's identity/session design and
   SURF-03's additive launch contracts. SURF-18 establishes local origins.
2. Implement login, sessions, shared transport, revocation and scoped menus;
   then shared shell/switching and compatible CI. Follow the native task bodies'
   hard prerequisites rather than treating the epic as a dependency.
3. Compose App Center and Invoice, supporting interactions and legacy links.
   Verify hosting, authorization, multi-origin E2E, responsive/localized UX and
   telemetry before the first rollout under SURF-24.
4. Compose HR over the existing People exports. Require SURF-17's direct-API,
   search/file/privacy checks and HR reruns of SURF-21/22/23 before enabling it.
   The parent remains incomplete while approved HR scope remains undelivered.

The proposed invoice-first decision covers **surface validation only**: existing
records/APIs, create/list/detail/edit/audit and necessary supporting workflows.
New operational-source drafting, expanded receivables/reminders, invoice lifecycle
changes, e-invoice formats and accountant handoff remain #353–356, with #334's
promotion decision or documented equivalent. Discover gaps and link their owning
tickets; do not fill them as incidental frontend extraction.

## Migration, release and rollback

No database migration is required by the surface decision. Future session storage
must follow the existing persistence policy and preserve identity links. Domain
records continue to be written by the same owning use cases.

Before cutover, SURF-19/24 records the actual provider projects/aliases, current
legacy deployment target, exact callbacks, route manifest, TLS coverage, session
and API compatibility, approved cohort, support owner and rollback target.
GitHub deployment history and a public root response do not supply those facts.

Keep the legacy artifact/routes available and deploy new clients additively.
Switch traffic/launch metadata by environment/cohort only after evidence passes.
On auth, routing or privacy failure: disable new launch destinations, restore the
previous edge/root mapping and legacy target, revoke affected new sessions and
verify legacy access. Do not restore revoked credentials or roll back business
data to undo a frontend move. Practice this procedure before expanding cohorts;
remove old routes only through a separate evidence-based deprecation decision.

## Alternatives and tradeoffs

| Alternative                                                     | Assessment                                                                                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Keep all workflows in the existing broad admin UI               | Lowest new hosting cost; does not provide the requested focused navigation and separate entry points. Retained as compatibility/rollback. |
| Repurpose `apps/portal`                                         | Rejected: it already owns customer/student/guardian routes and authentication.                                                            |
| Copy Invoice/People screens or split their APIs/data            | Rejected: duplicates existing owners, records and maintenance.                                                                            |
| Shared parent-domain browser token                              | Rejected for new surfaces: weakens origin isolation and does not solve callback/CSRF/revocation design.                                   |
| Thin focused clients with reusable sessions and one modular API | Proposed: reuses owners and isolates navigation; adds origin/TLS/session/CI/compatibility operational work that needs explicit evidence.  |

## Review and acceptance still required

- Platform/product: approve the first-wave surface scope, retained OpenBuk pilot,
  compatibility alias, legacy root/deep-link treatment and host matrix.
- Security/platform: review the matrix with SURF-02's issuer, account mapping,
  callbacks, CSRF, trusted proxy, session isolation, logout and outage design.
- Hosting/release owner: supply authoritative project/domain/certificate and
  identity registration readbacks under SURF-19/04 before activation.

These are named responsibilities, not invented assignees or recorded approvals.
#381 stays open until the required architecture/host-matrix review is recorded.
This draft changes documentation only; no frontend, DNS, auth, database or
deployment settings change, and no production-readiness claim is made.
