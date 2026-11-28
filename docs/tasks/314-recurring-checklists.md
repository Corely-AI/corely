# #314 Recurring opening and closing checklists

## Tracking and outcome

- Issue: https://github.com/Corely-AI/corely/issues/314; parent #285.
- Prerequisites #312 and #306 are closed/merged. #313 remains gated by #303 and is excluded.
- Branch: `314-recurring-checklists`; base: `corely/development` at `8ef16a66db`.
- PR: [Draft #378](https://github.com/Corely-AI/corely/pull/378), targeting `development`.
- Outcome: managers publish bounded recurring checklists which generate the same employee task records.
- Excludes My Work/boards (#313), comments/files (#315), new frontend/services/tables, AI and provider delivery.

## Reuse and decisions

Reuse Tasks' guarded lifecycle, workspace transaction lock, extension storage, permissions,
audit/outbox and shared OpenBuk/administration feature. People remains owner of staff profiles
and working availability. Extend narrow public projections; never copy personnel reasons.
Reuse the API-hosted background runtime and its service-token boundary.

Implemented policy (user selected one task with checkboxes): one task per active assignee/local day with checklist checkboxes; one immutable
occurrence per template/local date. Each generated task carries a step snapshot; checking/completing it never edits its template.
Existing task IDs and snapshots survive template edits and completion. Daily/selected-weekday schedules use a fixed IANA timezone, local due minute and
inclusive effective dates. Future edits cut over no earlier than tomorrow in that timezone.
Changing the timezone requires a new template. First publication may start today.

Catch up at most today and the previous two local dates; older missed work expires. DST gaps
are skipped explicitly; repeated local minutes use the earlier real instant. Pause/resume/end,
manual skipped dates, inactive assignees, unavailable published working days and revoked publisher
authority have explicit neutral outcomes. No external message delivery is implied by generation.

## Plan

1. Add validated recurring contracts and deterministic civil-date/occurrence rules.
2. Extend existing task persistence and People public eligibility projection; publish/version/replay commands.
3. Materialize tasks with checklist snapshots transactionally with guarded manual generation and bounded background execution.
4. Add shared manager UI, instance provenance and EN/DE/VI copy; preserve employee completion.
5. Exercise frozen clocks/DST, parallel retry, isolation, archival, pause/skip and browser completion.

## Verification and UI/UX evidence

Fresh local runs on 2026-11-08:

| Check                                                                                         | Result                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Tasks/recurrence rules, SQL lifecycle, outbox/credential boundary, Platform gating        | **44 passed**, seven files; no skips                                                                                                                |
| Shared Daily Work/checklist UI tests                                                          | **12 passed**, two files                                                                                                                            |
| API, contracts, kernel and OpenBuk TypeScript                                                 | Passed                                                                                                                                              |
| Contracts, API and OpenBuk builds                                                             | Passed                                                                                                                                              |
| OpenBuk Playwright: employee tasks plus two recurrence journeys, real API and separate SQL DB | **3 passed**; recurrence **2 passed** after visual refinements, and the manager journey **1 passed** with twelve parallel real HTTP replay requests |
| Changed-file ESLint/Prettier and staged source line limit                                     | Passed; targeted documentation links also passed                                                                                                    |
| Broader web-features TypeScript                                                               | Fails with 15 diagnostics in unchanged Assistant/Cash/People files; no Tasks diagnostics                                                            |
| `pnpm arch:check`                                                                             | Stops at the existing absent `services/worker/src`; script unchanged                                                                                |

Database tests used an agent-owned PostgreSQL cluster on local port 55444 and disposable
`tasks_test_314_r2` / `openbuk_test_314` databases. API on 33214, OpenBuk on 8104 and admin on
8105 were started from this worktree. External delivery/polling were disabled and only local
dummy provider values were supplied. A configured test-only service token exercised the strict
background endpoint; it is not saved in source. No shared database reset/migration occurred. All three task-owned services were stopped and
the disposable cluster removed after verification.

Reproduce with a separately prepared disposable schema and configured local API/clients:

```sh
DATABASE_URL="$TASKS_TEST_DATABASE_URL" pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/tasks/__tests__ src/modules/background/recurring-tasks-internal.spec.ts \
  src/modules/background/runtime/modules/tasks/employee-task-events.spec.ts \
  src/modules/platform/__tests__/tenant-entitlement-gating.spec.ts
pnpm --dir packages/web-features exec vitest run --config vitest.config.ts src/modules/tasks
pnpm --filter @corely/api typecheck
pnpm --filter @corely/contracts typecheck
pnpm --filter @corely/kernel typecheck
pnpm --filter @corely/openbuk-web typecheck
pnpm --filter @corely/api build
pnpm --filter @corely/contracts build
pnpm --filter @corely/openbuk-web build
# Set OPENBUK_BASE_URL, OPENBUK_TEST_DATABASE_URL, TASKS_ADMIN_BASE_URL,
# TASKS_RECURRING_SERVICE_TOKEN (matching the local API), OPENBUK_BROWSER_CHANNEL=chrome.
pnpm --dir apps/e2e exec playwright test --config playwright.openbuk.config.ts \
  employee-tasks.e2e.spec.ts recurring-checklists.e2e.spec.ts
```

SQL checks prove: immutable snapshots and template-to-completion, manager/staff and workspace
isolation, stale versions, skipped/inactive/unavailable/revoked-authority days, inclusive pause
intervals/tomorrow resume/end, DST gaps/folds, three-local-day catch-up, concurrent runners,
current-authority replay and rollback of tasks/markers/audit/outbox. Time tests also cover
half-hour DST, completely skipped dates and leap-day/local-midnight rollover.

The twelve-request test initially reproduced connection-pool starvation: the Platform app-install
adapter recognized only a historical `{prisma}` transaction wrapper and opened a separate
connection for direct transaction contexts. A narrow compatibility fix accepts both forms.
The same test then passed in under one second without raising transaction/pool timeouts.
A SQL regression proves reads see the active transaction's uncommitted disablement in both
context formats and preserve the original installation after rollback.

UI/UX inspected with synthetic data:

- OpenBuk desktop 1280×720, phone 390×844; EN/DE/VI. Administration dark theme 1440×1000.
- Publication, loading/empty, success, lost-response retry, stale editor/reload, denied staff
  access, manager pause/resume, neutral occurrence results and responsive overflow.
- Form title receives focus. A staff member can use Space to check a step; focus stays on the
  same input after saving. Completion stays disabled until every step is checked.
- Staff can complete their own generated task, cannot manage templates, and template bytes
  remain identical before/after completion. Both clients show the same task/step state.
- The flow works with external delivery and AI absent. Visiting Tasks/templates makes no
  Booking-discovery requests and does not publish public booking or install finance apps.

| Evidence                                                                          | View            |
| --------------------------------------------------------------------------------- | --------------- |
| [Empty manager list](314-assets/checklists-empty-desktop.png)                     | EN desktop      |
| [Publication form](314-assets/checklists-publish-desktop.png)                     | EN desktop      |
| [Generated occurrence](314-assets/checklists-generated-desktop.png)               | EN desktop      |
| [Stale editor](314-assets/checklists-conflict-desktop.png)                        | EN desktop      |
| [German manager view](314-assets/checklists-mobile-de.png)                        | DE phone        |
| [Vietnamese manager view](314-assets/checklists-mobile-vi.png)                    | VI phone        |
| [Staff checkbox progress](314-assets/checklist-progress-staff-mobile.png)         | EN phone        |
| [Denied management](314-assets/checklists-denied-staff-mobile.png)                | EN phone        |
| [Administration templates](314-assets/checklists-admin-desktop.png)               | EN dark desktop |
| [Administration completed task](314-assets/checklist-admin-completed-desktop.png) | EN dark desktop |

Captured images were inspected; only synthetic names/checklist content are present. Traces,
credentials, invitation links and diagnostic logs are excluded from source.

## PR review follow-up: timezone draft crash

The review reproduced `RangeError` when clearing or partially typing a timezone in a new
checklist. The start-date `useState` argument eagerly formatted the current zone on every
render, so invalid draft text bypassed validation and unmounted the form. A lazy initializer
now computes the initial date only on mount; draft text is validated on submission.

The new regression failed before the fix and passed afterward. Fresh follow-up checks:

- Shared Tasks UI suite: **13 passed**, including empty/partial timezone text, validation,
  retained title/date/steps/assignee/focus, and submission after entering a valid timezone.
- Real API-backed recurrence browser suite: **2 passed** on a fresh disposable
  `openbuk_test_378_fix` database. The manager journey clears the timezone, types an incomplete
  value character by character, verifies validation without draft loss, then completes publication
  and the existing checklist workflow after correcting it.
- OpenBuk typecheck/build and changed-file ESLint/Prettier: passed.
- [Rendered timezone validation](314-assets/checklist-timezone-validation-desktop.png), EN desktop
  1280×720, inspected with synthetic data. Existing layout evidence above remains applicable.

Backend code and broader repository/CI limitations are unchanged. The isolated API/client and
PostgreSQL cluster were stopped/removed after these checks.

## Impact and remaining work

No migration, deployment, automatic installation or merge. Existing records/contracts remain readable.
The PR stays Draft: broader shared-feature typecheck and architecture-runner baseline failures
are recorded, not hidden by scoped passes. Live scheduler configuration/activation and large-volume
performance remain unverified. Runtime policy/API details are in [recurring checklists](../backend/recurring-checklists.md).
