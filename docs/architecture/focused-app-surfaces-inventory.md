# Focused-app surfaces: source, hosts and backlog inventory

Evidence for [SURF-01 / #381](https://github.com/Corely-AI/corely/issues/381) and
[ADR-0003](../decisions/ADR-0003-focused-app-surfaces.md). Inspected 2026-11-08
at `development` / `3a3492196497d38da088b5222b96cd42bd01ad21`; remote `corely`
and GitHub's default branch `development` were checked live. This is a bounded
source/metadata inventory, not a runtime authorization audit.

## Source ownership and reuse

| Capability                           | Current owning source                                                                                                                                                                                                                                                                                                  | Observed behavior and residual gap                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared business API                  | `services/api/src/modules/invoices`, `services/api/src/modules/people`; [boundaries](BOUNDARIES.md)                                                                                                                                                                                                                    | Existing owners/use cases/adapters remain authoritative. New clients need no business service split.                                                                                                                                                                                                                  |
| Invoice records/contracts            | [invoice manifest](../../services/api/src/modules/invoices/invoices.manifest.ts), [contracts](../../packages/contracts/src/invoices), [HTTP adapter](../../services/api/src/modules/invoices/adapters/http/invoices.controller.ts)                                                                                     | Runtime ID `invoices`, dependency `parties`, default-enabled feature `app.invoices.enabled`, allowed surface `platform`. Menu requires `sales.invoices.read`; manifest permission names also include `invoices.*`. SURF-08/14 must reconcile actual grants/endpoint enforcement; renaming these is not an ADR change. |
| People records/contracts             | [People manifest](../../services/api/src/modules/people/people.manifest.ts), [module](../../services/api/src/modules/people/people.module.ts), [contracts](../../packages/contracts/src/people)                                                                                                                        | Runtime ID `people`, no manifest dependencies, default-enabled `app.people.enabled`, allowed surface `platform`; directory/self/private/document grants exist. HR is a label for a client over this owner.                                                                                                            |
| Persistence                          | People `infrastructure/ext-staff-*.adapter.ts`, [strategy](DATABASE_PERSISTENCE_STRATEGY.md)                                                                                                                                                                                                                           | People already uses extension adapters; do not introduce a duplicate personnel store. Invoice keeps its existing persistence owner. No surface-driven schema/migration.                                                                                                                                               |
| Invoice UI                           | [public route export](../../packages/web-features/src/features/invoices.tsx), [admin routes](../../apps/web/src/app/router/app-shell-routes.tsx), [capability aliases](../../apps/web/src/app/router/app-shell-capability-routes.tsx)                                                                                  | Reusable list/new/detail/edit at `/invoices`, `/invoices/new`, `/invoices/:id`, `/invoices/:id/edit`; export also includes `/audit`. Admin additionally has `/sales/invoices/*`. SURF-13/15 must preserve parameter mappings and scope audit access.                                                                  |
| People UI                            | [public exports](../../packages/web-features/src/modules/people/index.ts), [self-service export](../../packages/web-features/src/modules/people/self-service.ts), [admin routes](../../apps/web/src/app/router/app-shell-routes.tsx)                                                                                   | Directory/profile and staff journey/lifecycle are exported. Existing routes include `/people/staff`, `/people/staff/new`, `/people/staff/:id[/edit]`, `/people/me`, `/people/staff/:id/lifecycle`. Compose existing screens in SURF-16.                                                                               |
| Focused-client pattern               | [freelancer root](../../apps/freelancer/src/App.tsx), [router](../../apps/freelancer/src/app/router.tsx), [feature package](../../packages/web-features/package.json)                                                                                                                                                  | Existing client composes shared Providers and public feature routes; this is the reuse pattern, not an instruction to fork that app.                                                                                                                                                                                  |
| Registry and effective configuration | [registry](../../services/api/src/modules/platform/infrastructure/registries/app-registry.ts), [workspace config](../../services/api/src/modules/platform/application/use-cases/get-workspace-config.usecase.ts), [menu builder](../../services/api/src/modules/platform/application/services/menu-builder.service.ts) | Static manifests, effective tenant enablement, experience/capability/permission filtering and workspace membership checks exist. Lightweight catalog lacks launch/category metadata. Extend it in SURF-03/08/12.                                                                                                      |
| Host/surface authority               | [surface contract](../../packages/contracts/src/platform/surface.schema.ts), [request policy](../../services/api/src/shared/request-context/request-surface.ts), [proxy guide](../guides/VERCEL_SURFACE_PROXY.md)                                                                                                      | Enum is `platform`, `app`, `pos`, `crm`; hostname resolver recognizes POS/restaurant/CRM and otherwise returns platform. Trusted proxy keys, not browser surface claims, establish special surface context. Invoice/HR focus needs compatible extensions and negative tests.                                          |
| Browser auth                         | [web auth wrapper](../../packages/web-shared/src/lib/auth-client.ts), [storage](../../packages/web-shared/src/lib/storage-adapter.ts), [provider](../../packages/web-shared/src/lib/auth-provider.tsx), [Identity HTTP API](../../services/api/src/modules/identity/adapters/http/auth.controller.ts)                  | Existing web access/refresh tokens use localStorage; auth API has login/signup/refresh/logout/password-reset/me/switch-tenant. No OIDC callback registration was found in the inspected Identity/shared-client/router sources. This does not inventory an external issuer.                                            |
| Customer portal                      | [router](../../apps/portal/src/App.tsx), [auth store](../../apps/portal/src/stores/auth.ts), [rewrite config](../../apps/portal/vercel.json)                                                                                                                                                                           | `/login`, `/w/:slug/login` and workspace dashboard routes; student/guardian identity, memory access token and refresh-cookie behavior. Preserve this distinct surface.                                                                                                                                                |
| Operational pilot                    | [OpenBuk routes](../../apps/openbuk-web/src/app/app.tsx), [pilot decision](../products/corely/pilot-booking-decision.md), [package config](../platform/operational-package.md)                                                                                                                                         | Keep `/app/*`, `/book/:studioSlug`, `/invite`, login/signup/reset and public booking. #303's operational shell is still open; focused surfaces do not replace its acceptance.                                                                                                                                         |
| Deployment/CI                        | [deploy workflow](../../.github/workflows/deploy.yml), [web config](../../apps/web/vercel.json), [portal config](../../apps/portal/vercel.json)                                                                                                                                                                        | Repository deployment workflow still targets `main` and retains historical worker references. Vite web config has SPA fallback, not proof of an active edge proxy. SURF-19/20 reconcile actual configuration; this ticket changes none.                                                                               |

### Registered does not mean enabled or deployed

The inspected registry loads `core`, `platform`, `invoices`, `crm`, `portfolio`,
`issues`, `cms`, `expenses`, `parties`, `ai-copilot`, `tax`, `cash-management`,
`billing`, `sales`, `workspaces`, `purchasing`, `rentals`, `website`, `classes`,
`catalog`, `import`, `directory`, `booking`, `people`, `tasks`, `forms`,
`coaching-engagements`, `restaurant`, `pos-admin`, `nails` and `retail` manifests.
Actual tenant installations, effective entitlements and per-workspace enabled
capabilities were **not queried**. A manifest default does not establish them.
App Center must use authorized configuration rather than present every registry
entry as an available app. The marketing catalog is not this runtime registry.

## Host and authentication inventory

Public DNS/root HTTPS observations were made on **2026-11-08 at approximately
16:21–16:23 UTC** without credentials or following redirects. A root response
does not identify a deployment commit, prove a business flow, or export provider
bindings. The failures below describe this client/request, not a universal outage.

| Host / entry                         | Evidence                                                                                                         | What remains unknown                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.corely.one/`                    | DNS resolved; HTTPS 200; title `Corely - AI-native ERP Platform`. Proxy guide documents this host.               | Actual provider project/alias, active artifact, complete legacy routes and identity registrations. Preserve the binding until reviewed cutover. |
| `invoice.app.corely.one/`            | DNS resolved; HTTPS failed with TLS `SSLEOFError`.                                                               | Working certificate, route binding and focused client deployment. DNS alone is insufficient.                                                    |
| `hr.app.corely.one/`                 | DNS resolved; HTTPS failed with TLS `SSLEOFError`.                                                               | Same unknowns as Invoice; no usable HR origin established.                                                                                      |
| `login.corely.one/`                  | DNS resolved; HTTPS 404.                                                                                         | Issuer/provider, hosted login binding, registered clients/callbacks and session behavior.                                                       |
| `api.corely.one/`                    | DNS resolved; root HTTPS request timed out. Workflow/proxy guide names this API origin.                          | Current API deployment/revision and authenticated health; no endpoint health conclusion from the root timeout.                                  |
| `portal.corely.one/`                 | DNS resolved; HTTPS 200; title `Student & Guardian Portal`. Portal source includes host/path workspace handling. | Current workspace-host aliases and issuer/cookie registrations; keep existing portal authority.                                                 |
| `crm.corely.one/`, `pos.corely.one/` | DNS resolved; HTTPS 200; Corely title. Proxy guide documents separate trusted surfaces.                          | Current artifacts/edge settings and functional authorization. Preserve existing origins.                                                        |
| OpenBuk and public booking           | Source routes and `.env.example` show configurable app/booking origins; examples are not provider records.       | Active public/custom-domain bindings were not obtained. No forced public or POS auth migration.                                                 |

### Deployment records versus current provider settings

GitHub's first 100 deployment records were read; for each of the seven environment
names appearing there, its latest listed status was inspected. This bounded scan
is not a complete deployment-history export. Selected production records:

| Environment                           | Latest record in scan                                                              | Recorded revision / result                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `Production – corely-cash-management` | [5718117714](https://api.github.com/repos/Corely-AI/corely/deployments/5718117714) | 2026-08-02; `f3f7926c185121a64f3a61b62aeb39127fead340`; success |
| `Production – corely-portal`          | [5718080312](https://api.github.com/repos/Corely-AI/corely/deployments/5718080312) | Same date/revision; success                                     |
| `Production – corely-freelancer`      | [5718072918](https://api.github.com/repos/Corely-AI/corely/deployments/5718072918) | Same date/revision; success                                     |
| `Production – corely-crm`             | [5718065253](https://api.github.com/repos/Corely-AI/corely/deployments/5718065253) | Same date/revision; success                                     |
| `staging - docs-site`                 | [7623844254](https://api.github.com/repos/Corely-AI/corely/deployments/7623844254) | 2026-11-07; `26d611e510c785ccad78341f6564ecdcf05de770`; success |

Those statuses refer to immutable Vercel deployment origins for the four apps and
a Mintlify docs origin; they do not establish current custom domains or deployed
`development` behavior. No deployment URL is selected as a stable migration alias.
The available Vercel CLI context listed no Corely projects, and its accessible
team list did not expose the Corely hosting scope. Authoritative Corely project,
alias, environment, certificate and identity-provider settings remain unverified.
No settings, credentials, permissions or account scope were changed to obtain them.

### Existing entry paths and proposed callbacks

The inspected admin router has `/auth/login`, `/auth/signup`,
`/auth/forgot-password` and `/auth/reset-password`. The freelancer router shares
login/signup but redirects reset entries to login. OpenBuk has `/login`, `/signup`
and `/forgot-password`; Portal has its separate login/workspace routes. These are
existing UI entries, **not evidence of OIDC callbacks**. Legacy API authentication
continues through the Identity controller described above.

The [ADR host/callback matrix](../decisions/ADR-0003-focused-app-surfaces.md#approved-application-host-and-callback-matrix)
defines proposed exact new production/staging entries and the treatment of
`app.corely.one`. Actual issuer allowlists and local origin/port pairs still need
SURF-02/04/18/19 evidence. No existing identity registration was overwritten.

## Existing backlog reconciliation

GitHub bodies, state/reason, comments and closing-PR metadata for all 15 issues
below were read on 2026-11-08. No comments were returned for these issues.
The seven cited closing PRs are merged, and their merge commits are in the
inspected base. State is evidence of delivery integration for that bounded scope,
not proof of current deployment or passing tests in this task. Existing issue
bodies may retain unchecked planning criteria after closure.

| Existing issue                                                       | Live state and integration evidence                                           | Reuse / residual surface responsibility                                                                                                                                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#282 / EP-PLATFORM](https://github.com/Corely-AI/corely/issues/282) | Open                                                                          | Keep operational-workspace epic and its remaining acceptance; new surface work stays under #380.                                                                                              |
| [#301 / PLAT-01](https://github.com/Corely-AI/corely/issues/301)     | Closed/completed; merged [#369](https://github.com/Corely-AI/corely/pull/369) | Reuse operational-package contracts, independent gates and manifest/configuration services. SURF-03/08/12 add launch/focus metadata; no second app framework.                                 |
| [#302 / PLAT-02](https://github.com/Corely-AI/corely/issues/302)     | Closed/completed; merged [#372](https://github.com/Corely-AI/corely/pull/372) | Reuse shared membership/private-access/cache foundation and [policy](../platform/operational-access.md). SURF-08/10/17/21 still verify real surface endpoints and private People projections. |
| [#303 / PLAT-03](https://github.com/Corely-AI/corely/issues/303)     | Open                                                                          | Owns Schedule/Team/Daily Work shell in the selected existing OpenBuk client. SURF-09 reuses shared shell primitives for separate focused clients; it does not complete or supersede #303.     |
| [#304 / PLAT-04](https://github.com/Corely-AI/corely/issues/304)     | Closed/completed; merged [#374](https://github.com/Corely-AI/corely/pull/374) | Reuse resumable setup and explicit staff invitations; no duplicate onboarding or auto-publish when opening App Center.                                                                        |
| [#283 / EP-PEOPLE](https://github.com/Corely-AI/corely/issues/283)   | Open                                                                          | Existing People owner and remaining epic/pilot acceptance stay intact; do not replace it with an HR engine epic.                                                                              |
| [#305 / PEOPLE-01](https://github.com/Corely-AI/corely/issues/305)   | Closed/completed; merged [#373](https://github.com/Corely-AI/corely/pull/373) | Directory, identity/resource links and private-field projections exist. SURF-16 composes public exports; SURF-17 verifies cross-origin privacy.                                               |
| [#306 / PEOPLE-02](https://github.com/Corely-AI/corely/issues/306)   | Closed/completed; merged [#375](https://github.com/Corely-AI/corely/pull/375) | Reuse deterministic patterns, exceptions and Booking availability port; do not create a second schedule store.                                                                                |
| [#307 / PEOPLE-03](https://github.com/Corely-AI/corely/issues/307)   | Closed/completed; merged [#377](https://github.com/Corely-AI/corely/pull/377) | Reuse absence history, neutral effects and protected personnel file paths; SURF-17 must test actual direct API/search/file access.                                                            |
| [#308 / PEOPLE-04](https://github.com/Corely-AI/corely/issues/308)   | Closed/completed; merged [#379](https://github.com/Corely-AI/corely/pull/379) | Reuse own-field self-service, lifecycle and explicit access follow-up; new HR routing must preserve workspace/revocation rules.                                                               |
| [#295 / EP-INVOICES](https://github.com/Corely-AI/corely/issues/295) | Open; P2 conditional                                                          | Retain billing business scope and promotion gate. First-wave UI/session validation is separately bounded in ADR-0003.                                                                         |
| [#353 / INV-01](https://github.com/Corely-AI/corely/issues/353)      | Open; P2 conditional                                                          | Lifecycle/demand/build-or-integrate, optional Accounting and specialist gaps remain here. SURF-13 composes existing invoice flows; report gaps without expanding them.                        |
| [#354 / INV-02](https://github.com/Corely-AI/corely/issues/354)      | Open; P2 conditional                                                          | Operational-source invoice drafts are not added by surface extraction.                                                                                                                        |
| [#355 / INV-03](https://github.com/Corely-AI/corely/issues/355)      | Open; P2 conditional                                                          | Expanded delivery/receivables/reviewed reminders retain this owner. SURF-14 only integrates existing behavior and assistant boundaries.                                                       |
| [#356 / INV-04](https://github.com/Corely-AI/corely/issues/356)      | Open; P2 conditional                                                          | Format/accountant acceptance remains separate; no compliance claim from a new hostname or UI.                                                                                                 |

No existing issue was reprioritized, reparented, reopened or closed by this
reconciliation. #353–356 retain the #334 promotion decision or documented
equivalent gate; approving a surface validation slice is not that promotion.

After the source inspection and merge of #406, the maintainer
[approved the requested three-host plan](https://github.com/Corely-AI/corely/issues/381#issuecomment-6724086565)
on 2026-11-08 and instructed alignment with
[#382 / PR #405](https://github.com/Corely-AI/corely/pull/405).
The former alternate-host proposal is withdrawn. This later decision does not
change the source/host observation baseline or establish live registrations.

## Capability-to-delivery map

The native parent is [#380 / EP-APP-SURFACES](https://github.com/Corely-AI/corely/issues/380).
Each requested capability below has existing owners and one explicit SURF delta;
acceptance tests/UI evidence remain with the ticket delivering the behavior.

| Requested capability / delta                         | Existing reuse                                                         | Surface ticket                                                                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Architecture, host migration and overlap decision    | Connected-app rules, existing clients and issues above                 | [SURF-01 / #381](https://github.com/Corely-AI/corely/issues/381) — merged ADR/inventory plus recorded host approval |
| Central identity/session design                      | Identity accounts/membership, existing auth contracts                  | [SURF-02 / #382](https://github.com/Corely-AI/corely/issues/382)                                                    |
| Categorized launchable catalog                       | Existing manifests, registry, catalog wire schema                      | [SURF-03 / #383](https://github.com/Corely-AI/corely/issues/383)                                                    |
| Login entry and exact registered callbacks           | Central identity entry/frontend selected under SURF-02                 | [SURF-04 / #384](https://github.com/Corely-AI/corely/issues/384)                                                    |
| Host-specific server sessions                        | Reusable transport adapter in front of the same API                    | [SURF-05 / #385](https://github.com/Corely-AI/corely/issues/385)                                                    |
| Shared provider/client session transport             | web-shared, auth-client, api-client                                    | [SURF-06 / #386](https://github.com/Corely-AI/corely/issues/386)                                                    |
| Logout, revocation and old-client migration          | Existing Identity/session lifecycle                                    | [SURF-07 / #387](https://github.com/Corely-AI/corely/issues/387)                                                    |
| Focused menus and independent backend checks         | Menu/config/entitlement services; #301/#302                            | [SURF-08 / #388](https://github.com/Corely-AI/corely/issues/388)                                                    |
| Configurable shell, All apps and global switcher     | Shared layout/UI; reuse with #303 without replacing its shell scope    | [SURF-09 / #389](https://github.com/Corely-AI/corely/issues/389)                                                    |
| Valid workspace handoff and isolated caches          | Workspaces access and shared cache foundation                          | [SURF-10 / #390](https://github.com/Corely-AI/corely/issues/390)                                                    |
| Thin App Center                                      | Shared Providers/UI and existing catalog APIs                          | [SURF-11 / #392](https://github.com/Corely-AI/corely/issues/392)                                                    |
| Authorized tile visibility and admin enablement      | Existing Platform installs/entitlements; #301/#302                     | [SURF-12 / #393](https://github.com/Corely-AI/corely/issues/393)                                                    |
| Thin Invoice list/create/detail/edit/audit routes    | Existing public Invoice exports and API owner                          | [SURF-13 / #394](https://github.com/Corely-AI/corely/issues/394)                                                    |
| Invoice supporting interactions and assistant limits | Party/Documents/settings/Copilot owners; #353/#355 stay separate       | [SURF-14 / #395](https://github.com/Corely-AI/corely/issues/395)                                                    |
| Invoice deep links and compatibility                 | Current `/invoices/*`, `/sales/invoices/*`, notifications/public links | [SURF-15 / #396](https://github.com/Corely-AI/corely/issues/396)                                                    |
| Thin HR client over existing People screens          | #305–308, public People/self-service exports                           | [SURF-16 / #397](https://github.com/Corely-AI/corely/issues/397)                                                    |
| HR direct-API/search/file/cross-app privacy          | People use cases, protected documents and #302 foundation              | [SURF-17 / #398](https://github.com/Corely-AI/corely/issues/398)                                                    |
| Reproducible local origins and callbacks             | Existing workspace/build tooling                                       | [SURF-18 / #391](https://github.com/Corely-AI/corely/issues/391)                                                    |
| Staging/production routing, TLS and trusted headers  | Existing hosting/proxy conventions; actual provider readback required  | [SURF-19 / #399](https://github.com/Corely-AI/corely/issues/399)                                                    |
| Focused/shared compatibility CI                      | Current workspace scripts and CI; branch/worker drift remains explicit | [SURF-20 / #400](https://github.com/Corely-AI/corely/issues/400)                                                    |
| Multi-origin E2E and negative authorization checks   | Existing suites and #302; release process reuse                        | [SURF-21 / #401](https://github.com/Corely-AI/corely/issues/401)                                                    |
| Responsive, accessible and EN/DE/VI focused UX       | Shared UI/i18n and existing screen evidence                            | [SURF-22 / #402](https://github.com/Corely-AI/corely/issues/402)                                                    |
| Surface telemetry and migration monitoring           | Existing observability infrastructure                                  | [SURF-23 / #403](https://github.com/Corely-AI/corely/issues/403)                                                    |
| Gated cohort release, rollback and docs              | Existing quality/pilot process; #334 promotion remains independent     | [SURF-24 / #404](https://github.com/Corely-AI/corely/issues/404)                                                    |

Source tests for manifests/menu configuration, People directory/availability/
absences/self-service and invoice HTTP/use cases/E2E were inspected where cited
by the owning code/docs. They were **not executed** for this prose delivery.
New application, SSO, browser, DNS/TLS activation, migration and release acceptance
remain in their named tickets; this inventory supplies no replacement evidence.
