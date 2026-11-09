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
backend-internal imports are rejected, including relative paths. Invoice must
use its own public feature route entry point. This is a source boundary check;
it does not measure production bundle sizes or prove that tree shaking removes
every unused component. Each app still emits its own build artifact.

App Center and focused Invoice browser suites exercise existing shared contracts
with synthetic cookie-session transport. Shared session/shell and App Center unit
regressions also run. This complements existing legacy CI; it is not live API or
multi-origin deployment acceptance. No wire contract or server behavior changes
in this ticket. Browser failure screenshots are retained under `test-results`.
Interface changes still require the PR's own UI/UX evidence.

Run locally:

```sh
node --test scripts/ci/frontend-policy.test.mjs
node scripts/ci/frontend-policy.mjs
node scripts/ci/frontend-policy.mjs --matrix
pnpm --dir apps/invoice typecheck
pnpm --dir apps/invoice build
pnpm --dir apps/e2e exec playwright test --config playwright.invoice.config.ts
```

Install Playwright Chromium first, or set `PLAYWRIGHT_CHANNEL=chrome` for an
installed local Chrome. CI installs its own Chromium. The discovery test asserts
both existing and focused clients are retained; there is no changed-path bypass.
