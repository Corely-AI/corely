# #400 — Focused client CI

- Issue: https://github.com/Corely-AI/corely/issues/400 (SURF-20; parent #380).
- Earlier PR: https://github.com/Corely-AI/corely/pull/420 (merged; checks were not all green).
- Prerequisites #381 and #391 verified closed Completed on November 9, 2026.
- Follow-up branch `400-ci-followup`, base `origin/development` at `8768b5e94`.
- Scope: conservative complete Vite-consumer fan-out, isolated validation/build
  artifacts, import boundaries, existing focused browser and shared unit suites.
- Canonical behavior and reproducible commands: [consumer CI](../frontend/consumer-ci.md).
- No UI change, deployment, merge, migration or API contract change.

## Follow-up verification — November 10, 2026

The merged workflow's actual Actions logs show missing generated Prisma types, a nonexistent
`e2e:smoke` command, and four failing legacy consumer typechecks. This follow-up generates
Prisma before root CI builds/tests, uses the actual default branch and replaces the unconfigured
browser invocation with the existing isolated workspace-session suite plus Chromium setup and
artifacts for PR/default-branch checks. The existing `main` trigger/full browser command is
retained. It preserves all discovered consumer checks and independent failure reporting.

Review findings fixed: Windows selected WSL's `bash` instead of Git Bash; runner fixture paths
containing spaces were mishandled; lint-staged's E2E exclusion missed absolute paths; the
architecture command used Windows URL pathname conversion and referenced a removed worker;
the SSO transport probes called Documents through a deliberately restricted Invoice origin.
The probe is now under its allowed synthetic Invoice route; production access is unchanged.

Fresh checks:

- `node --test scripts/ci/*.test.mjs`: 10 passed, no skips, including failed-unit continuation,
  retained logs, paths with spaces and absolute-path hook selection.
- `node scripts/ci/frontend-policy.mjs`: passed against actual frontend source.
- Real host-session SSO transport integration: 26 passed, no skips, using the disposable local
  SSO database. All six earlier fixture failures are corrected without changing production code.
- Workspace-session Chromium suite: 6 passed, no skips, matching the new root browser job.
- `pnpm prisma:generate` and `pnpm --filter @corely/data typecheck`: passed. Generation changes
  local generated files only; no migration or application database operation was run.
- Scoped ESLint and diff whitespace checks: passed. Changed-file formatting is checked before PR.
- Fresh web, CRM, freelancer and cash-management typechecks still fail in unchanged shared
  Assistant/Cash screens and Invoice CustomerSelection DTO typing; web also has the existing
  tenant-apps test matcher error. These are retained failures, not waived success.
- `pnpm arch:check` now executes on Windows and fails on existing Prisma-placement findings
  across application/background/script files. It does not crash on the removed worker path.
- Historical full Actions runs are linked above; the follow-up's hosted checks must be read
  after publication. Full repository unit/typecheck/lint/format checks are not claimed green.

UI/UX evidence is not applicable: this follow-up changes CI, local validation and isolated test
fixtures, with no customer screen changes. No merge, deployment or rollout is performed. Keep
Draft until remaining required checks have an accepted resolution.

## PR #428 conflict resolution — November 10, 2026

Merged `origin/development` at `d050cd5b8` into the current CI head `4517c3dba`, preserving the #401 multi-origin work already merged through #429. Resolved three conflicts: both general Playwright collectors retain the multi-origin exclusion alongside every integrated focused suite, and the E2E TypeScript project retains both observability and multi-origin configurations. Reviewed the automatic session/context/transport-test merges: WebKit's CORS-mode correction, bounded diagnostics, request-local failures, HR permission discovery and Invoice's restricted route roots remain intact.

Fresh checks after resolution:

- All CI-script tests **15 passed**, no skips, including Windows Git Bash execution, absolute-path hook filtering, forced-failure continuation and sanitized browser reporting. Frontend import scan passed; both general collectors find **0 cases** in each of the five isolated focused/multi-origin directories.
- Targeted session/provider/shell/telemetry/legacy-route units **85 passed**. Five API integration files **53 passed**, no skips, including all **27** SSO transport cases, real callback diagnostics and direct authorization boundaries.
- Workspace-session browser suite **6/6** and real HTTPS multi-origin suite **18/18** passed, without retries; the latter executes the actual clients in Chromium and WebKit. The saved sanitized summary reports passed for all 18 cases. Fresh Chromium App Center and masked WebKit Invoice evidence were visually inspected.
- Frozen offline install, Prisma generation, shared/browser package builds, data/API typechecks, multi-origin and scoped configuration TypeScript, changed-config lint, formatting, local links and staged whitespace passed. Current-schema DDL was applied only to a newly created, labelled, loopback-only PostgreSQL container/database. The task-owned container was removed after the tests; no application database or historical migration was changed.

Self-review found no further issues. This conflict update adds no customer UI behavior and does not broaden backend access. Required legacy consumer/architecture checks and deployment/pilot gates remain separate; they were not rerun or suppressed here, and full root/hosted CI is not claimed green. Normal DCO/pre-commit checks and the documented broad pre-push baseline bypass are retained; current PR review state is preserved. No PR merge or deployment.

## Historical verification from PR #420

- Import policy: four node tests passed; actual frontend source scan passed.
- Invoice, App Center and login typechecks passed.
- Invoice, App Center and login builds passed.
- App Center browser suite: three passed using installed local Chrome.
- Initial Invoice browser attempt used missing bundled Chromium; reran using
  the explicit local Chrome override added to its existing configuration: six passed.
- Scoped ESLint passed. Repository architecture check retains its pre-existing
  missing `services/worker/src` failure; new frontend scanner passes independently.
- Full consumer matrix and hosted Actions execution require the published PR;
  local focused checks do not claim every legacy consumer passes.
- Source policy covers public route entry points, not a production bundle-size audit.
  No HR workspace is scaffolded by this task; discovery includes it once present.

## Review corrections — November 9, 2026

Confirmed and corrected four scoped findings:

- **P1, browser setup:** the first hosted run selected Ubuntu 26.04 via
  `ubuntu-latest`; Playwright 1.57 refused to install Chromium for that image,
  so neither browser suite ran. Pin browser jobs to supported `ubuntu-24.04`.
  The installed Playwright registry includes that target. Hosted verification of
  the pin remains pending on the corrected head.
- **P2, suppressed regressions/evidence:** a shared-unit failure skipped both
  App Center's own tests and browser suite, and unit output was absent from
  artifacts. An independent runner now attempts every applicable check, records
  command output/exit codes and fails if any check fails. A subprocess fixture
  forces unit exit 7 and proves subsequent checks run and logs are retained.
- **P2, unrelated routes:** Invoice could import a different app's feature through
  the shared aggregate export, bypassing the direct route-entry rule. Reject that
  aggregate import and inspect actual rendered Invoice chunks, including shared
  barrels and lazy imports. A real Vite fixture rejects indirect/lazy CRM routes
  and accepts Invoice routes. This adds one CI-only, non-writing Invoice build;
  it does not change the app's normal configuration or emitted artifact.
- **P2, missed import syntax:** import types, import-equals and static template
  imports bypassed the source scanner. Handle those AST forms. The two new source
  regressions failed on the old policy and passed after the fix.

Fresh verification in this review:

- Nine CI-policy/runner tests passed; actual frontend import scan passed.
- Current Invoice bundle policy passed: 995 rendered modules, 4,407 transformed.
- Actionlint, Bash syntax, scoped ESLint, Prettier and whitespace checks passed.
- Revised real App Center runner: shared tests 91 passed / 3 failed with the
  unchanged Node 24/jsdom `AbortSignal` incompatibility; it continued to App Center
  unit/build tests (16 passed) and browser tests (3 passed), then correctly exited 1.
- Revised Invoice runner: six browser tests passed and exited 0.
- The first hosted run completed all 11 consumer jobs: seven passed, four legacy
  clients (web, freelancer, CRM, cash-management) exposed the existing shared
  assistant/cash type errors. Those owners are unchanged from the base. Source:
  https://github.com/Corely-AI/corely/actions/runs/42655216482.
- The root architecture failure and deployment-provider rate limits remain
  outside this ticket. No checks were weakened or skipped to report success.
