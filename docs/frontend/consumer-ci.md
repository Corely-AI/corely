# Frontend consumer checks

Run frontend consumer checks locally. The [archived Frontend consumers workflow](../../backup/github-actions/frontend-consumers.yml)
records the previous setup for checking all Vite workspaces. Business modules and SSO consumers build with `apps/web`. The other Vite clients are the portal, landing and restaurant listing.

Each consumer generates Prisma, builds shared dependencies, then runs lint,
typecheck and its own build independently in the archived workflow. For a local
run, generate Prisma and build shared dependencies before checking the consumer.

The TypeScript AST import policy checks static imports, exports, dynamic imports
and require calls in frontend source. App-private imports across workspaces and
backend-internal imports are rejected, including relative paths and TypeScript
import types/import-equals. Invoice must use its own public feature route entry
point rather than the aggregate feature export.

The Invoice bundle check uses a Rollup policy that inspects rendered chunk
modules, including routes reached indirectly through shared re-exports and lazy
imports. It rejects unrelated feature route contributions, other domains' screen,
page or route files, other apps' private source and backend runtime source.
Supporting shared components remain reusable. The check rebuilds with
`write: false`, preserving the app's own build artifact, and retains the rendered
module inventory in `ci-results/invoice-bundle-modules.json`. This does not set
bundle-size budgets or audit each component's business behavior.

App Center, focused Invoice and HR browser suites exercise existing shared contracts
with synthetic cookie-session transport. Shared session/shell and App Center unit
regressions also run. These independent checks run through
`scripts/ci/run-focused-checks.sh`: a failed unit suite does not suppress the
remaining unit or browser checks. Every command's output and exit code is retained
in `ci-results/focused-<suite>`. Any failed check produces a nonzero exit code.
Browser failure screenshots are retained under `test-results`.
Interface changes still require the PR's own UI/UX evidence.

Run locally:

```sh
node --test scripts/ci/*.test.mjs
node scripts/ci/frontend-policy.mjs
node scripts/ci/frontend-policy.mjs --matrix
node scripts/ci/check-invoice-bundle.mjs
bash scripts/ci/run-focused-checks.sh app-center
pnpm --dir apps/web typecheck
pnpm build:focused --surface=invoice
pnpm --dir apps/e2e exec playwright test --config playwright.invoice.config.ts
```

Install Playwright Chromium first, or set `PLAYWRIGHT_CHANNEL=chrome` for an
installed local Chrome.

## Historical CI follow-up (#400)

The archived root CI workflow generated Prisma before package builds/typechecks/unit tests and
ran on pushes to `development` and `main` as well as on PRs. Its former browser job called a missing
`e2e:smoke` script and had no browser installation or configured full-suite API environment.
It ran the existing isolated workspace-session browser suite on Ubuntu 24.04 and retained
failure screenshots. App Center and Invoice used separate suites.

Runner regression tests select Git Bash on Windows instead of the WSL launcher and handle
temporary paths containing spaces. Set `CORELY_TEST_BASH` when Git Bash is installed outside
`%ProgramFiles%\Git\bin\bash.exe`. They still inject a failed unit command and verify that
later checks execute, logs survive and the job fails. lint-staged resolves absolute file paths
before applying its existing E2E exclusion; application checks remain selected.

The root architecture command resolves Windows file URLs correctly and scans the API-hosted
background owner instead of an absent `services/worker`. Existing architecture violations
still fail the command. The frontend AST import and Invoice bundle policies remain the gates
for the focused client boundaries; this follow-up does not claim a full backend architecture
audit or repair legacy module ownership.

The SSO transport fixture uses a synthetic transfer controller under the already allowed
Invoice route root. Documents remain excluded from the production Invoice BFF. The fixture
continues to verify JSON/base64 bytes, streaming, cancellation, origin/CSRF, idempotency/trace
headers and body limits with actual host sessions. It is not a business endpoint.

The earlier merged PR #420 recorded consumer typecheck failures in Assistant/Cash shared
screens and a tenant-management test. Run the affected checks on the revision under review
to establish current results.
