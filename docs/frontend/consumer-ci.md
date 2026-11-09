# Frontend consumer CI

The `Frontend consumers` workflow runs on PRs and pushes to `development`.
It discovers Vite workspaces from their package manifests, including future HR
when that workspace exists. Every consumer runs on every change: app-only changes
and shared-package changes use the same conservative fan-out. This costs more CI
work than pruning by changed paths, but cannot omit an affected consumer because
of an incomplete dependency graph. Existing web, freelancer, CRM and OpenBuk
remain included alongside App Center, login and Invoice.

Each consumer generates Prisma, builds shared dependencies, then runs lint,
typecheck and its own build independently. A failed lint/typecheck does not hide
the build result. Exit codes appear in the job summary; logs and separate `dist`
artifacts are retained even after a failed check. Failures are not converted to
success. Existing repository-wide CI remains in place.

The TypeScript AST import policy checks static imports, exports, dynamic imports
and require calls in frontend source. App-private imports across workspaces and
backend-internal imports are rejected, including relative paths and TypeScript
import types/import-equals. Invoice must use its own public feature route entry
point rather than the aggregate feature export.

Invoice also builds with a CI-only Rollup policy that inspects rendered chunk
modules, including routes reached indirectly through shared re-exports and lazy
imports. It rejects unrelated feature route contributions, other domains' screen,
page or route files, other apps' private source and backend runtime source.
Supporting shared components remain reusable. The check rebuilds with
`write: false`, preserving the app's own build artifact, and retains the rendered
module inventory in `ci-results/invoice-bundle-modules.json`. This does not set
bundle-size budgets or audit each component's business behavior.

App Center and focused Invoice browser suites exercise existing shared contracts
with synthetic cookie-session transport. Shared session/shell and App Center unit
regressions also run. These independent checks run through
`scripts/ci/run-focused-checks.sh`: a failed unit suite does not suppress the
remaining unit or browser checks. Every command's output and exit code is retained
in `ci-results/focused-<suite>` and the Actions summary. Any failure still fails
the job. Setup failures can prevent checks from starting; Actions records those
steps as skipped. This complements existing legacy CI; it is not live API or
multi-origin deployment acceptance. No wire contract or server behavior changes
in this ticket. Browser failure screenshots are retained under `test-results`.
Interface changes still require the PR's own UI/UX evidence.

Run locally:

```sh
node --test scripts/ci/*.test.mjs
node scripts/ci/frontend-policy.mjs
node scripts/ci/frontend-policy.mjs --matrix
node scripts/ci/check-invoice-bundle.mjs
bash scripts/ci/run-focused-checks.sh app-center
pnpm --dir apps/invoice typecheck
pnpm --dir apps/invoice build
pnpm --dir apps/e2e exec playwright test --config playwright.invoice.config.ts
```

Browser CI uses `ubuntu-24.04`, supported by the pinned Playwright 1.57.
`ubuntu-latest` currently resolves to an image unsupported by that version; its
install failure must not be mistaken for a browser-test failure.

Install Playwright Chromium first, or set `PLAYWRIGHT_CHANNEL=chrome` for an
installed local Chrome. CI installs its own Chromium. The discovery test asserts
both existing and focused clients are retained; there is no changed-path bypass.
