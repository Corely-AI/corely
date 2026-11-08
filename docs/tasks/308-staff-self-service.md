# #308 Staff self-service and controlled onboarding/offboarding

## Tracking and outcome

- Issue #308, parent #283. Hard prerequisites #304/#305/#312 are closed and merged.
- Branch `308-staff-self-service`, current base `corely/development` at `012158eb17` (merged #307); original base `0ef158482a` (#378).
- Draft PR [#379](https://github.com/Corely-AI/corely/pull/379). #307 is integrated through the current development base; its absence/file behavior is preserved.
- Staff read their own permitted profile/published availability and edit display name/personal
  contact details only. Managers approve one onboarding task with checklist checkboxes and review
  unfinished work/bookings/access before departure. No payroll, absence handling, scoring or global
  account deletion is added.

## Reuse and plan

People owns profiles/private contacts/working patterns and the lifecycle link in extension storage.
Tasks owns the approved onboarding task, checkboxes, progress and existing staff completion.
Booking owns future booking/hold commitments; archiving preserves them. Workspaces owns membership
status. Any access disablement is an explicit, separately authorized workspace action; it never
changes tenant roles, global Identity accounts or unrelated workspaces.

Use narrow public owner adapters and existing locks/transaction/audit/outbox. Keep lock order
Tasks → People → Booking; don't import TasksModule into PeopleModule or duplicate account/task records.
Reauthorize current workspace/subject on reads, mutations and replay. Self projections never include
manager notes, other personnel history, file links or raw account/Party IDs. New self permissions are
explicit; existing custom roles are not silently rewritten.

1. Add strict wire contracts, own-profile policy and versioned/replay-safe contact edits.
2. Add public Tasks/Workspaces lifecycle operations with owner authorization and atomic state/events.
3. Add staff mobile self-service and manager approval/departure UI via shared public exports.
4. Prove role/scope/stale-authority/rollback negatives and onboarding/departure browser journeys.
5. Document runtime policy, inspect screenshots, sign off and publish a linked Draft PR.

## Verification

Fresh checks on 8 November 2026 against base `0ef158482a`; prerequisite library builds
were generated locally. Dependencies were already installed. Local workspace package
links were isolated so another checkout's concurrent builds could not replace contracts.

| Command/check                                                                                                                                                                                             | Actual result and limits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --dir services/api exec vitest run src/modules/people/__tests__ src/modules/tasks/__tests__ src/modules/identity/__tests__/operational-access.spec.ts src/modules/background/runtime/modules/tasks` | **117 passed, 14 files, no skips.** Set `DATABASE_URL` and `PEOPLE_TEST_DATABASE_URL` to the disposable People database; `TASKS_TEST_DATABASE_URL` to the disposable Tasks database. Includes existing directory/availability/Tasks regressions plus current subject, strict field/model arguments, two tenants/multiple workspaces, scoped disablement, replay/concurrency, current-authority checks after locks, reassignment privacy, superseded recurrence, audit/outbox rollback and neutral event handlers. |
| `pnpm --dir packages/web-features exec vitest run src/modules/people src/modules/tasks`                                                                                                                   | **37 passed, 8 files, no skips.** Includes allowlisted edits, uncertain-response retry keys, read-only controls, EN/DE/VI, denial draft removal, stale workspace responses, explicit access confirmation and existing Tasks/People interaction regressions.                                                                                                                                                                                                                                                       |
| `pnpm --dir apps/e2e exec playwright test --config playwright.openbuk.config.ts staff-self-service.e2e.spec.ts employee-tasks.e2e.spec.ts recurring-checklists.e2e.spec.ts`                               | New self-service and both neighboring UI journeys passed. The fourth background case initially failed because this invocation omitted `TASKS_RECURRING_SERVICE_TOKEN`; rerunning that case with the local API's configured token passed. **Four cases passed across the two invocations, no skips.**                                                                                                                                                                                                              |
| `pnpm --dir services/api typecheck` / `build`                                                                                                                                                             | Passed. Full API startup also resolved new module dependencies/routes.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm --dir packages/contracts build`                                                                                                                                                                     | Passed. No generated distribution is committed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pnpm --dir apps/openbuk-web typecheck` / `build`                                                                                                                                                         | Passed. Self-service uses a portable public export without importing the administration client's providers.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Changed-file ESLint / Prettier; `git diff --check`; staged source line limit                                                                                                                              | Passed explicitly; this worktree has no generated Husky hook launcher.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm --dir packages/web-features typecheck`                                                                                                                                                              | Blocked by 12 diagnostics in unchanged Assistant/Cash Management and the existing People profile-form test (`getByRole`'s unsupported `exact` option). No diagnostic in the new journey source/tests.                                                                                                                                                                                                                                                                                                             |
| `pnpm arch:check`                                                                                                                                                                                         | Existing script fails scanning absent `services/worker/src`; no worker was recreated. Cross-owner imports were manually checked against public interfaces and owning infrastructure adapters.                                                                                                                                                                                                                                                                                                                     |

Disposable PostgreSQL cluster `/tmp/corely-308-pg`, localhost port 55446, databases
`people_test_308`, `tasks_test_308`, `openbuk_test_308`. Schema was generated from the
current Prisma schema and applied only there. No shared database reset, migration or
`db push`. API port 33220, OpenBuk 8108, administration 8109; external delivery disabled,
scheduler noop, polling disabled. Test-owned processes/cluster are stopped after validation.
Browser/trace authentication artifacts stay out of the repository.

The browser test signs up a synthetic owner, accepts a real Staff invitation, explicitly
links a Staff profile, publishes working hours, approves one checklist, completes its
checkboxes, and archives/disables with a real future booking and unfinished task.
It proves that the live staff draft and old token cannot save/read Tasks or known private
file routes after revocation. Staff cannot retrieve manager-private profile fields before
departure either. SQL proves other-workspace access is preserved. No #307-specific
personnel file grant or absence behavior is asserted.

## UI/UX evidence

Rendered Chrome: manager administration at **1440×1000**; Staff OpenBuk at **390×844**
in EN/DE/VI; manager layout also checked at 390×844 without horizontal overflow.
Screenshots below were inspected visually; they contain synthetic data only.

- [Manager checklist approval](308-staff-self-service-ui/onboarding-approval-desktop.png)
- [Departure review and explicit access choice](308-staff-self-service-ui/departure-review-desktop.png)
- [Preserved history after departure](308-staff-self-service-ui/departure-history-desktop.png)
- [No approved onboarding yet](308-staff-self-service-ui/self-onboarding-empty-mobile.png)
- [Allowed own-field edit with working pattern](308-staff-self-service-ui/self-details-edit-mobile.png)
- [Completed onboarding EN](308-staff-self-service-ui/self-onboarding-mobile-en.png), [DE](308-staff-self-service-ui/self-onboarding-mobile-de.png), [VI](308-staff-self-service-ui/self-onboarding-mobile-vi.png)
- [Revoked access clears private projection/draft](308-staff-self-service-ui/self-access-revoked-mobile.png)

Checked labels, edit autofocus, keyboard Tab/Enter submission, 44px controls, wrapping,
localized weekdays, explicit timezone, empty/success/denied states, unavailable Tasks
copy, retry after a lost committed reply and stale response isolation. Departure defaults
to archiving only; actual workspace administration is required for the additional checkbox.
No AI/provider connection is needed for the manual workflow. Native mobile, production
deployment, provider delivery and customer pilot acceptance were not tested.

## Impact and remaining work

No migration, automatic sensitive access, booking cancellation, deployment or merge. Existing task,
staff and account identities remain separate. No #307 unmerged file/absence behavior is claimed.
Current behavior and policy: [staff self-service](../backend/staff-self-service.md).
Draft delivery retains the existing unrelated check limitations above; human review remains pending.

PR readback confirmed head `308-staff-self-service` and base `development`. The seven
Vercel surface checks currently fail with the provider’s build-rate-limit URL; no preview
or deployment success is claimed. Keep Draft pending human review and check resolution.

## Development conflict resolution — 8 November 2026

Merged `corely/development` at `012158eb17ddedeb6753feb53881bfa471527a05`
(#307 / private absences) into this ticket branch. Resolved three overlapping files:

- `people.module.ts`: retain Documents/absence providers and controller together with
  self-service/lifecycle and Tasks/Workspaces owner adapters.
- `staff-profile-page.tsx`: retain the absence component and the controlled lifecycle
  link, removing obsolete React imports from the replaced immediate archive dialog.
- Tasks fixture: retain both lifecycle setup and the new absence repository argument
  required by the availability use case.

No owning rules, routes, contracts, styles or layouts were changed by conflict resolution.
The diff against current development remains confined to #308 work.

Fresh verification on the combined tree:

- People/Tasks suites, Booking OpenBuk/availability, Documents proxy/personnel files,
  operational access and Tasks/People outbox facts: **158 tests / 21 files passed**.
- People/Tasks UI command above: **45 tests / 9 files passed**.
- `DATABASE_URL=<owned> SKIP_PRISMA_CONNECT=true pnpm --dir services/api exec vitest run
src/__tests__/di-smoke.int.test.ts --maxWorkers=1 --minWorkers=1`:
  **10 tests passed**, including full AppModule construction with both feature sets.
  The first DI collection lacked an unbuilt local integration library; after building
  API dependencies, the rerun passed. No test was skipped.
- API typecheck/build, `pnpm build:api` with its required dependency-output guard,
  Contracts build, and OpenBuk typecheck/production build: passed. The dependency
  guard reports optional CJS outputs as warnings; required runtime outputs are present.
- Scoped ESLint/Prettier, conflict-marker/unmerged-entry scan, whitespace and staged
  source line limit: passed explicitly.

Regression databases were newly created on a task-owned PostgreSQL cluster at loopback
port 55448: `people_test_308_merge`, `tasks_test_308_merge`, `openbuk_test_308_merge`.
Only those disposable databases received schema setup and fixture mutations. The owning
schema is unchanged; no migration/shared reset/provider delivery occurred. The cluster
was stopped and removed after verification.

Browser E2E was not rerun for this import/wiring-only resolution; earlier feature
screenshots and browser results above remain historical evidence. Existing global-check
and preview-rate-limit limitations remain recorded; no PR merge or deployment is authorized.
