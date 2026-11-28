# 307 — Private absences and neutral availability effects

## Tracking and outcome

- Issue: [#307 / PEOPLE-03](https://github.com/Corely-AI/corely/issues/307), parent [#283](https://github.com/Corely-AI/corely/issues/283).
- Prerequisites: #305/#306 staff and availability implementations are integrated, including availability review correction #375.
- Branch: `307-private-absences`; base: `development`, inspected `8ef16a66db24559dc7193d79edbd193cc877242a` on 8 November 2026; remote `corely`.
- PR: [Draft #377](https://github.com/Corely-AI/corely/pull/377), verified head/base and five screenshot links.
- Outcome: managers record already-approved absences with restricted reasons/files; operational consumers receive neutral unavailable intervals. Corrections/cancellation retain history and do not alter appointments.
- Excludes employee submission/approval routing (#308 and Requests), leave entitlements, payroll, exports, AI retrieval/actions, automatic messages/reassignment, migrations and deployment.

## Reuse and decisions

Reviewed the existing People directory/private fields, availability contracts and
constraint service, Booking locks/commitment port and OpenBuk/generic write paths,
Identity/Workspaces current-authority checks, Documents upload/link/file/proxy and
public routes, legacy Issue/transcription bridges, extension persistence, audit,
outbox, manifest, shared People UI, cache boundaries and neighboring tests.

The residual implementation extends People and shared web feature exports. It
introduces no employee/resource duplicate, new app surface or competing schedule
store. [Maintained policy](../backend/people-absences.md) owns ranges, history,
permission matrix, HTTP operations and file boundary details.

Managers explicitly record an already-approved absence; no new approval engine is
inferred. Full-day civil ends are exclusive; partial inputs are explicit UTC.
Corrections append versions effective at recording time; cancellation preserves
elapsed blocks and history. Booking uses the existing neutral window integration;
Working patterns shows live affected commitment IDs. Existing appointments remain
unchanged, including when new availability conflicts with unfinished occupancy.

Personnel files are fresh uploads through a narrow Documents port, with a permanent
`personnel-` ID namespace and workspace/absence binding. Generic metadata, lists,
links, signing, completion, proxy/public bytes and Issue/transcription bridges
reject that namespace. There is no conversion of existing generic documents or
signed personnel URL. The authenticated proxy rechecks grants after storage I/O.
Database metadata/audit/replay is transactional; storage can retain inaccessible
orphan objects after rollback, as documented in the maintained policy.

## Verification

Disposable PostgreSQL 16 cluster on loopback port 55437, with task-owned databases
`people_test_307`, `openbuk_test_307` and `tasks_test_307`. Applied checked-in
migrations using `prisma migrate deploy`; no shared database reset or seed, new
migration, provider messaging or background delivery. Tests guard their database
names and clean up only generated tenant/workspace fixtures.

| Command / check                                                                                                                                                                                                                                                                                                                                                                | Actual result and scope                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PEOPLE_TEST_DATABASE_URL=<owned> OPENBUK_TEST_DATABASE_URL=<owned> pnpm --dir services/api exec vitest run src/modules/people/__tests__ src/modules/booking/__tests__/openbuk.int.test.ts src/modules/booking/__tests__/openbuk-availability.spec.ts src/modules/documents/application/use-cases/proxy-download/proxy-download.usecase.test.ts --maxWorkers=1 --minWorkers=1` | 84 tests / 11 files passed, no skips, after the final split and cancellation-capacity check.                                                                                                                                     |
| `TASKS_TEST_DATABASE_URL=<owned> pnpm --dir services/api exec vitest run src/modules/tasks/__tests__ --maxWorkers=1 --minWorkers=1`                                                                                                                                                                                                                                            | 18 tests / 2 files passed, no skips, covering the updated availability fixture constructor.                                                                                                                                      |
| `pnpm --dir packages/web-features exec vitest run src/modules/people`                                                                                                                                                                                                                                                                                                          | 21 tests / 6 files passed, no skips: absence flows, versions, unchanged retries, private/file permission gating, late workspace responses and downloads, plus existing People behavior.                                          |
| `DATABASE_URL=<owned> SKIP_PRISMA_CONNECT=true pnpm --dir services/api exec vitest run src/__tests__/di-smoke.int.test.ts --maxWorkers=1 --minWorkers=1`                                                                                                                                                                                                                       | 10 tests passed; full AppModule and new Documents/People wiring instantiate.                                                                                                                                                     |
| `pnpm --filter @corely/contracts typecheck`, `pnpm --filter @corely/api typecheck`                                                                                                                                                                                                                                                                                             | Passed on the final source.                                                                                                                                                                                                      |
| `pnpm --filter @corely/contracts build`, `pnpm --filter @corely/api build`, `pnpm --filter @corely/web build`                                                                                                                                                                                                                                                                  | Passed; web retains large-chunk warnings.                                                                                                                                                                                        |
| `pnpm --filter @corely/web typecheck`                                                                                                                                                                                                                                                                                                                                          | Eight errors in unchanged Assistant/Cash files; no People errors. The failing source paths have no diff against the inspected base.                                                                                              |
| `pnpm arch:check`                                                                                                                                                                                                                                                                                                                                                              | Existing checker stops at absent historical `services/worker/src`; that checker/path is unchanged.                                                                                                                               |
| Changed-file ESLint/Prettier, local documentation links and `git diff --check`                                                                                                                                                                                                                                                                                                 | Passed with zero lint errors; only existing Documents/Issue `any` warnings and configured API test exclusions. New production files have no lint warnings. 130 local documentation references resolve; diff whitespace is clean. |

Persisted checks exercise Staff/Manager roles, two tenants and multiple workspaces,
actual private records and neutral projections, half-open overlaps/corrections,
optimistic and concurrent commands, rollback/replay, generic document/link/public
bypasses, actual stored file metadata and returned bytes, denied/revoked grants,
workspace revocation, slow-storage reauthorization, and Booking conflicts/races
without appointment changes. Storage uses a byte-bearing fake; real GCS/IAM and
malware/content inspection are not verified. No absence export/audit/AI retrieval
is exposed or claimed tested.

The first broad API invocation hit 5-second timeouts in the existing directory
suite while builds/typechecks were also running. A two-case isolated diagnostic
passed; a full rerun passed all 83 tests in 17 seconds. The diagnostic selected
only two cases and is not counted as a full-suite pass. One initial new test used
an invalid workspace-membership enum; corrected it to `DISABLED` and reran.

## Rendered UI/UX evidence

Actual administration route `/people/staff/staff-anna`, synthetic manager, private
reader and Staff identities, Chrome, desktop 1440×1100 and phone 390×844. The
browser uses synthetic route responses; PostgreSQL/HTTP tests independently prove
owner/authorization integration. This is not a deployed/full-stack browser session.

- [Desktop approved absence, history and attachment](./assets/307/approved-desktop.png).
- [Phone approved absence](./assets/307/approved-mobile.png).
- [Phone attachment access](./assets/307/attachments-mobile.png).
- [Phone failed correction with retained draft/reload](./assets/307/stale-mobile.png).
- [Phone cancellation confirmation](./assets/307/cancel-mobile.png).

Inspected all retained captures. Checked empty/loading, denied/error/retry,
full-day create, partial UTC overnight correction, unchanged retry, optimistic
version payload, cancellation confirmation/history, actual browser download,
attachment upload, Staff/private-reader gating, keyboard label/focus order,
phone overflow and EN/DE/VI. Manual controls require no AI. Native date-input
formatting follows the browser locale; server intervals remain explicit.

Used the installed Playwright runtime after the skill's CLI wrapper reported
`playwright-cli: command not found`. Scratch script/logs and extra captures live
in ignored `tmp/307` and `output/playwright/307`; five sanitized PNGs above are the
review artifacts. The React best-practices and UI-change procedures were applied.

## Final review and limits

Self-review covered the full change, owning contracts, authorization/relations,
neutral projections, correction history, resource locking, replay and rollback.
Reserved cancellation capacity prevents an active record's history limit from
stranding future blocks. The final refresh passed 84 API checks, 21 People UI
checks and Contracts/API typechecks; the 18 Tasks and 10 DI checks above also
passed in this delivery (133 targeted checks total, no skips in those full runs).

API/web builds passed; the API build was refreshed after the history guard.
Broad root tests/lint/format, deployed browser sessions, real storage/IAM and pilot
acceptance are not claimed. The unchanged web type errors and architecture-check
failure remain open. Browser evidence uses route fixtures, not production identity
issuance or storage delivery. No auto-merge or deployment.

The issue stays open, Project status In progress, and PR #377 stays Draft pending
human review/required checks. Normal pre-commit formatting, lint and line-limit
checks passed. Publishing uses the pre-push hook's documented `HUSKY=0` escape
after scoped verification because the unchanged broad checks above remain blocked.
The connected GitHub app rejected PR creation with “must be a collaborator”; the
authenticated `gh` account created it successfully. Initial readback showed the
four GitHub Actions checks queued; external preview statuses were reported by
the repository automation and were not runtime-verified here.

The task-owned PostgreSQL cluster and Vite server were stopped after verification.

## Review corrections — 8 November 2026

Reviewed PR #377 at `3c2ee0fce` against `development` (`8ef16a66d`). Two P2
findings were confirmed and corrected on the same ticket branch:

1. Personnel upload keys ignored `STORAGE_KEY_PREFIX`. The Documents adapter now
   receives the typed EnvService prefix and applies it to new object keys, matching
   ordinary uploads. The file row stores that same key. Downloads continue using
   stored keys, preserving existing unprefixed files without migration.
2. The partial-day correction form truncated accepted UTC seconds/milliseconds
   before submission. It now retains the complete timestamp without the terminal
   UTC marker and allows precise native datetime input. Editing only a reason
   preserves the original interval; explicit precise time changes still save.

Regression proof before the fixes: both new seconds/milliseconds UI cases failed,
while six existing absence cases passed. The configured-prefix adapter case also
failed; the no-prefix case passed. The corrected code passes all four new cases.

Fresh correction checks (119 tests total, no skips):

- The API command in the original verification table plus
  `src/modules/documents/__tests__/personnel-documents.spec.ts`:
  **86 tests / 12 files passed**, using the task-owned PostgreSQL cluster and
  isolated `people_test_307` / `openbuk_test_307` databases.
- `pnpm --dir packages/web-features exec vitest run src/modules/people`:
  **23 tests / 6 files passed**.
- The full AppModule DI command above: **10 tests passed**, including typed
  EnvService injection into the personnel Documents adapter.
- `pnpm --filter @corely/api typecheck`, API build and web build: passed.
- Changed-file ESLint/Prettier and diff whitespace: passed; API test exclusions
  retain the repository's existing lint configuration.
- Web typechecking was refreshed and still reports only the same eight unchanged
  Assistant/Cash errors. No CI repair or broader architecture rewrite is included.
  The 18 Tasks passes above remain initial-delivery evidence, not a fresh fix run.

Rendered the actual staff detail with synthetic route fixtures in Chrome at
1440×1100 and 390×844. Verified native control validity, reason-only round-trip of
`09:00:45.123–10:00:45.987` UTC, explicit millisecond edits, keyboard navigation
through native date/time segments, and no horizontal overflow. Inspected the
[desktop precise-time editor](./assets/307/precision-desktop.png) and
[phone precise-time editor](./assets/307/precision-mobile.png). Original lifecycle
and permissions evidence remains above. The browser fixture does not verify
production identity or GCS/IAM.

The repository's existing CI failures were inspected during review: generated
Prisma client/type information is missing for quality/unit checks, and browser CI
invokes absent `e2e:smoke`. Those paths are unchanged. PR #377 remains Draft;
no merge or release is performed. Normal signed-commit hooks are retained, and
publication continues to use the documented pre-push escape for the broader
verification blockers. Task-owned PostgreSQL and Vite are stopped after checks.

## Development conflict resolution — 8 November 2026

Integrated current `corely/development` at `0ef158482` (recurring checklists #378)
into `307-private-absences`, preserving the existing ticket commits. The only
textual conflicts were adjacent imports in `people.module.ts` and the Tasks
fixture. Resolved them by retaining the absence repository/controller/Documents
wiring and the incoming StaffWorkdayLookup/recurring-checklist wiring. No owning
rules, routes, copy or layouts were changed during resolution.

Fresh on the combined tree:

- Original People/Booking/Documents API command plus `src/modules/tasks/__tests__`
  and the personnel-document adapter suite: **120 tests / 16 files passed**.
  Task-owned `people_test_307`, `openbuk_test_307` and `tasks_test_307` databases
  were used on the existing isolated PostgreSQL cluster; no shared reset or seed.
- `pnpm --dir packages/web-features exec vitest run src/modules/people src/modules/tasks`:
  **36 tests / 8 files passed**.
- Full AppModule DI command above: **10 tests passed**, proving both People and
  recurring-checklist providers/controllers instantiate. All 166 checks ran
  without skips.
- Kernel/Contracts builds, API typecheck/build and web build: passed. Web retains
  existing large-chunk/Browserslist warnings.
- Conflict markers/unmerged entries, scoped formatting and diff whitespace were
  checked; normal signed-merge commit hooks are retained. The PR diff against the
  new base contains only #307 work; incoming #314 changes are part of the base.

The resolved imports and fixture do not change rendered behavior; existing #307
UI evidence remains applicable, and #314's evidence is maintained with its own
base delivery. Broader web/architecture and CI limitations above remain; they
were not repaired as part of conflict resolution. PR #377 had already been
marked ready at the start; its review state is preserved. No PR merge or release
is performed. Publication uses the documented pre-push escape after scoped
verification, and the task-owned PostgreSQL cluster is stopped after testing.
