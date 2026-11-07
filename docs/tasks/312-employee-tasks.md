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
with task changes. No background event consumer or notification delivery is added.

App installation and role grants remain explicit provisioning steps. Shared frontend type debt, the stale architecture-check path and the existing oversized Billing
files remain review blockers. Keep the PR Draft; no merge,
deployment, pilot acceptance or downstream #313–#315 work is included.
