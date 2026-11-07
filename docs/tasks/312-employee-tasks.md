# #312 Employee tasks

## Tracking and outcome

- Issue: https://github.com/Corely-AI/corely/issues/312; parent #285.
- Completed prerequisites: #298 (access), #305 (staff), #302 (package composition).
- Branch: `312-employee-tasks`; base: `corely/development` at `426954b774`.
- PR: https://github.com/Corely-AI/corely/pull/376 (Draft; base `development`).
- Outcome: create, assign, edit, complete and reopen daily work with one versioned record.
- Excludes recurrence, comments, attachments, Projects, CRM activities and workflow execution tasks.

## Reuse and plan

Tasks owns its small domain in existing extension storage, without migrations. People owns staff
identity and archival; Tasks consumes a neutral public projection and coordinates assignment with
People's workspace write lock. Identity and Platform remain the authority for current membership,
permissions and effective app enablement. Tasks installation depends on People, not finance.

Managers (`tasks.manage` plus `tasks.read`) manage workspace tasks. Linked active staff with
`tasks.read` see their own tasks; `tasks.own.update` permits completing/reopening their own work.
Read-only roles cannot mutate. Archived profiles retain task history; reassignment requires an
active profile in the same workspace. No private personnel fields enter the task projection.

Commands require an idempotency key; updates and state transitions require the displayed version.
Writes, replay records, audit and outbox commit together. Replays reauthorize and return the current
record. A reusable Daily Work feature serves existing clients; no new frontend deployment.

## Verification

Checked 2026-11-08 against `corely/development` at `426954b774`; local isolated PostgreSQL,
real Nest HTTP guards/persistence and Chrome. Delivery/background drivers were disabled;
only synthetic identities and test-owned data were used. Disposable databases were created
from the Prisma schema on a dedicated local cluster; no shared database was reset or migrated.

| Check                                                                    | Result and limits                                                                                                                                                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task lifecycle/SQL + Billing/entitlement/package suites (6 files)        | 30 passed; includes 10 task HTTP tests, 2 task contract/lifecycle tests, 8 parallel retries with a five-connection pool, stale edits, permission/app revocation after lock, atomic rollback and archival |
| People directory/rules + operational access + permission suite (4 files) | 44 passed; current memberships, host/tenant boundaries, neutral/private projections and transaction-aware owner lookups                                                                                  |
| OpenBuk Playwright configuration with `TASKS_ADMIN_BASE_URL`             | 3 passed; employee tasks across both clients, anonymous public booking and private setup/invitations                                                                                                     |
| `pnpm --filter @corely/api typecheck` / `build`                          | Passed                                                                                                                                                                                                   |
| `pnpm --filter @corely/contracts build`                                  | Passed                                                                                                                                                                                                   |
| `pnpm --filter @corely/openbuk-web typecheck` / `build`                  | Passed                                                                                                                                                                                                   |
| Changed-source ESLint / Prettier                                         | Passed with the repository 8 GB lint heap setting; `lint-staged --concurrent false` passed                                                                                                               |
| Staged source size gate                                                  | Failed: existing oversized BillingAccessService and PrismaBillingRepository files touched by optional transaction propagation; no line-limit exemption added                                             |
| Frozen offline lockfile verification                                     | Passed: `pnpm install --lockfile-only --frozen-lockfile --offline --ignore-scripts`                                                                                                                      |
| `pnpm docs:check` and changed-document relative links                    | Passed                                                                                                                                                                                                   |
| Shared-feature and administration typechecks                             | Blocked by existing Assistant/Cash/People-test diagnostics; all 15 shared-feature diagnostics exactly reproduced in an untouched detached checkout at `426954b774`. No task diagnostics                  |
| `pnpm arch:check`                                                        | Stops before assertions: existing script scans absent `services/worker/src`; no architecture-pass claim                                                                                                  |

Reproduce the backend checks from the API workspace with `DATABASE_URL` set to the same
explicitly disposable `TASKS_TEST_DATABASE_URL` (`tasks_test_*`), then run Vitest on:
`src/modules/tasks/__tests__/{task-rules.spec.ts,employee-tasks.int.test.ts}`,
`src/modules/billing/__tests__/billing-access.service.spec.ts`,
`src/modules/platform-entitlements/adapters/__tests__/tenant-entitlements-read.adapter.spec.ts`,
`src/modules/platform/__tests__/{tenant-entitlement-gating.spec.ts,operational-package-configuration.spec.ts}`.
The neighboring People SQL suite uses a separate `PEOPLE_TEST_DATABASE_URL` (`people_test_*`).

For browser verification start the API against `OPENBUK_TEST_DATABASE_URL` (`openbuk_test_*`),
OpenBuk with `OPENBUK_API_PROXY_TARGET` pointing to that API, and the administration client with
`VITE_API_BASE_URL` pointing to the same API. Set `OUTBOX_DISPATCH_DRIVER=disabled`,
`JOB_SCHEDULER_DRIVER=noop`, `WORKER_DISABLE_POLLING=true`; use local dummy provider credentials
only when adapter initialization requires them. From the root run:

```sh
TASKS_ADMIN_BASE_URL=http://127.0.0.1:8098 \
OPENBUK_BASE_URL=http://127.0.0.1:8097 \
OPENBUK_BROWSER_CHANNEL=chrome \
pnpm --dir apps/e2e exec playwright test --config playwright.openbuk.config.ts
```

The test's app fixture requires a test-owned synthetic tenant in that disposable database.
It provisions People/Tasks as deployment prerequisites because the current Platform app
controller is host-scoped; tenant sessions cannot self-install through it. It neither relaxes
production authorization nor proves a self-service installation journey. Existing custom roles
need explicit new task grants; this slice does not rewrite existing tenant roles.

## UI/UX evidence

Rendered and visually inspected OpenBuk `/app/tasks` (manager and linked Staff) at desktop
1280×720 and phone 390×844, EN/DE/VI; administration `/tasks` at 1440×1000 in dark mode.
The shared feature uses theme tokens with OpenBuk fallbacks. The phone navigation uses two
columns for long translated labels. Screenshots contain synthetic data only.

| State                                                                                 | Evidence                                                                                   |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Create form, labels, initial title focus, optional local due time; empty list         | [Desktop form](./assets/312/tasks-create-desktop.png)                                      |
| Task created/assigned; complete and reopen                                            | [Desktop list](./assets/312/tasks-list-desktop.png)                                        |
| Stale edit rejected and local form retained until explicit reload                     | [Conflict](./assets/312/tasks-stale-desktop.png)                                           |
| Uninstalled app denied                                                                | [Unavailable](./assets/312/tasks-disabled-desktop.png)                                     |
| German and Vietnamese, phone overflow checks                                          | [German](./assets/312/tasks-mobile-de.png), [Vietnamese](./assets/312/tasks-mobile-vi.png) |
| Staff completes own task, no create/edit control; backend creation denied             | [Staff phone](./assets/312/tasks-staff-mobile.png)                                         |
| Same completed record in administration, reopened there and read back through OpenBuk | [Administration](./assets/312/tasks-admin-desktop.png)                                     |

The browser test also loses an already committed create response and safely retries one record,
checks successful edit preserves due-instant precision, and exercises stale versions and staff
invitation/account linking. Dates show the device timezone; no physical mobile device, provider
delivery, AI flow, pilot usage or volume/performance acceptance is claimed.

## Impact and remaining work

Additive contracts, module/manifest/routes, small extension-storage namespace; no migration,
new service, finance activation or Projects dependency. Platform/Identity/People public read
ports accept an optional transaction so authorization and assignment checks reuse the write
connection; ordinary callers keep their existing behavior. Audit/outbox/replay records commit
with task changes. The existing API-hosted dispatcher acknowledges validated task lifecycle facts without adding
notification delivery or other external side effects.

App installation and role grants remain explicit provisioning steps. Shared frontend type debt, the stale architecture-check path and the existing oversized Billing
files remain review blockers. Keep the PR Draft; no merge,
deployment, pilot acceptance or downstream #313–#315 work is included.

## PR #376 review follow-up (2026-11-08)

Reviewed head `45bfb1ec0` against `development` at `426954b774`. There were no posted inline
review threads; the confirmed findings below came from source review and reproductions.

| Finding                                          | Reproduction and correction                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2 — invalid due offsets escape validation       | `+24:00`/`+99:99` passed the original Zod datetime check and threw `RangeError`; offset normalization at the year bounds could also produce an unreadable stored date. Reject non-finite dates and require the normalized output to satisfy the UTC wire schema. Five contract cases and HTTP 400 regression checks pass.                      |
| P2 — Daily Work depends on Booking endpoints     | Blocking `/openbuk/*` made `/app/tasks` fail before Tasks loaded. Skip Booking discovery/setup on that route and reload Booking state when navigating back to settings. The browser test first failed with the generic Booking error; it now completes the task journey with zero Booking requests and resumes the saved setup afterward.      |
| P2 — valid task events permanently fail dispatch | The four new lifecycle types had no handler and the existing poller classified them as permanent failures. Register narrow, payload-validating acknowledgements in that dispatcher, retaining normal sent-event history and adding no external delivery. The regression changed from four errors to zero; unknown/malformed events still fail. |
| P2 — denied actions retain the old projection    | 401/403/404 responses left previously loaded team records and an editor visible. Clear the projection, choices, drafts and replay keys, then require a fresh read on explicit retry. Five component tests cover access/ownership denial and preservation of drafts for 409/500 recovery.                                                       |

Fresh follow-up verification (these are new runs, separate from the initial delivery above):

- API: **37 passed** across seven lifecycle/SQL, dispatcher, Billing, entitlement and package test files.
- Shared Daily Work component: **5 passed**; before the fix, all three denial cases failed.
- OpenBuk Playwright configuration: **3 passed**, with both clients against an isolated
  `openbuk_test_376` API and provider/background delivery disabled. Public booking and private
  setup/invitations remain covered. The access-denial browser response is deliberately simulated;
  persisted authorization boundaries are covered separately by the SQL HTTP tests.
- API and OpenBuk typecheck/build, contracts build and changed-source ESLint pass.
- Follow-up staged ESLint/formatting, 500-line source gate, whitespace and relative-link checks passed. The two
  oversized Billing files in the original PR remain an existing full-PR size-gate limitation;
  this correction does not add a gate exemption or change those files.

Visually inspected the unchanged desktop task flow with Booking blocked and the new phone
access-denial state. [Working task flow while Booking requests are blocked](./assets/312/tasks-booking-blocked-desktop.png)
(1280×720); [cleared projection after denied action](./assets/312/tasks-access-changed-mobile.png)
(390×844). No tokens, invitation links or customer data are in these captures.

The initial broad frontend/architecture limitations remain documented above; these fixes do
not claim those gates passed. GitHub checks on the reviewed head also failed: Quality/unit jobs lack generated Prisma Client
exports, browser CI calls the missing `e2e:smoke` script, and Vercel reports its daily deployment
quota. Keep this PR Draft. No merge, release or real provider delivery was run.
