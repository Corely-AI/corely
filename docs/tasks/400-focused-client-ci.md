# #400 — Focused client CI

- Issue: https://github.com/Corely-AI/corely/issues/400 (SURF-20; parent #380).
- Draft PR: https://github.com/Corely-AI/corely/pull/420.
- Prerequisites #381 and #391 verified closed Completed on November 9, 2026.
- Branch `400-focused-client-ci`, base `corely/development` at `05fceeeb34`.
- Scope: conservative complete Vite-consumer fan-out, isolated validation/build
  artifacts, import boundaries, existing focused browser and shared unit suites.
- Canonical behavior and reproducible commands: [consumer CI](../frontend/consumer-ci.md).
- No UI change, deployment, merge, migration or API contract change.

## Verification

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
