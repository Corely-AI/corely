# #392 — Thin App Center client

## Tracking and outcome

- Issue: [#392](https://github.com/Corely-AI/corely/issues/392), parent #380.
- Dependencies #386, #389, #390 and #391 verified Done in Project #1 before starting.
- Branch: `392-app-center`; base: `development` at `e71783f190`.
- PR: [Draft #417](https://github.com/Corely-AI/corely/pull/417).
- Outcome: authenticated workspace directory, localized search/categories, account/
  workspace actions and safe supported app launches.
- Excludes marketplace, enablement administration (#393), business screens,
  production host cutover, deployment and changes to `apps/portal`.

## Reuse and implementation

Use `WorkspaceSessionProviders`, session-scoped query keys, the existing
`GET /menu/launches` projection, shared UI/tokens and shell launch URL validation.
No new records, contracts, backend owner or authentication flow. The App Center
header has no business sidebar; `FocusedAppShell` intentionally accepts only the
Invoice/HR launch IDs and requires their business menu. The client uses existing
session/workspace actions without widening that shell's contract.

Available launches revalidate current server grants before navigation. Invalid,
missing, disabled and unreleased destinations never become active links. A pending
launch cannot navigate after its workspace boundary unmounts. Query parameters
supply only workspace intent; destination origins come from server descriptors.

## Verification

Node v24.2.0; local dependencies linked using `pnpm install --offline --ignore-scripts`.
Lockfile retains only the new workspace importer; unrelated resolver changes discarded.

| Command/check                                                                                               | Actual result                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter @corely/app-center test`                                                                     | 13 passed across 2 files                                                                                                                                                       |
| `pnpm exec vitest run --workspace vitest.workspace.ts --project app-center`                                 | Same 13 passed through root workspace integration                                                                                                                              |
| `pnpm --filter @corely/app-center typecheck`                                                                | Passed, strict TypeScript                                                                                                                                                      |
| `pnpm exec eslint apps/app-center/src apps/app-center/postcss.config.js apps/app-center/tailwind.config.js` | Passed, no warnings                                                                                                                                                            |
| `pnpm --filter @corely/app-center build`                                                                    | Passed; approximately 291 kB gzip JS; existing contract/shared dependency graph produces a >500 kB chunk warning                                                               |
| Vite build with temporary module-graph assertion                                                            | Passed: no `packages/web-features`, `apps/web` or `apps/portal` modules                                                                                                        |
| Pre-push `pnpm test:unit`                                                                                   | 1,403 passed, 7 skipped, 3 failed with the same 3 AbortSignal errors; 313 test files passed, 1 failed. Hook stopped before its remaining format/lint/typecheck/API-build steps |
| Shared session suite (`pnpm --dir packages/web-shared exec vitest run --config vitest.config.ts`)           | 88 passed, 3 failed in unchanged `workspace-session-provider.spec.tsx`, 3 unhandled Node/jsdom AbortSignal errors                                                              |
| Same failing shared spec in detached base worktree                                                          | Identical 3 failures/3 errors; 6 passed. No shared source/test changes in this ticket                                                                                          |
| `pnpm arch:check`, also in detached base                                                                    | Both fail on stale `services/worker/src` reference (ENOENT); no replacement worker created                                                                                     |

Changed-file Prettier, local documentation references and staged whitespace checked
before commit. Full repository lint/typecheck, live API/issuer E2E, trusted HTTPS
multi-origin gateway and production hosting checks were not run for this client
slice. Bare preview uses route-mocked session/API responses; it proves client
behavior and static history fallback, not deployed authorization or routing.

## UI/UX evidence

See [App Center behavior and screenshots](../frontend/app-center.md).
Reviewed production preview on Chromium at 1440×900 and 390×844 with synthetic
staff/workspaces. EN/DE/VI labels/layout; no phone horizontal overflow. Exercised
search/no-match, categories, account keyboard focus return, sign-out, workspace
switch and refresh, loading/empty/error/retry, session outage/retry, Coming soon,
stale grants and workspace-preserving Invoice/approved-HR destinations.
No credentials or real customer/personnel records in evidence.

## Impact and remaining work

This adds an opt-in static client; it changes no legacy routes, live origins,
server release flags, API records or migrations. Production/staging routing remains
#399 and traffic cutover remains #396/#404. HR is launchable only if the server
releases and authorizes it. Review broader baseline test/tooling failures separately.
The pre-push hook rejected publication on the reproduced baseline unit failures.
Publish this Draft using its documented `HUSKY=0` escape hatch; no test or hook is
changed. Remaining hook-wide checks are unrun; targeted client checks passed.
Keep the PR Draft; no merge or deployment was requested or performed.

## Review correction — root-invoked Tailwind build

Review of PR #417 found one P1 delivery defect: the documented focused build/dev
wrapper retains the repository working directory, but Tailwind's automatic config
lookup and content globs used that directory. A root-invoked build failed at
`@apply border-border`; the earlier standalone build had hidden the problem.

PostCSS now resolves the app's Tailwind config using its own module URL, and
Tailwind resolves content files relative to that config. A child-process build
regression invokes Vite from the repository root, uses a disposable output directory,
and checks app, responsive and shared UI styles. It failed before the fix and
passes afterward. No shared source or backend behavior changed.

Fresh checks after correction:

- App Center tests: 14 passed (including the build regression), standalone and
  root test workspace.
- Strict client typecheck, targeted ESLint and changed-file Prettier passed.
- `CORELY_DEV_ENV_FILE=/tmp/corely-417-focused.env pnpm build:app-center` passed with
  disposable synthetic build-only configuration. No API, certificate trust or
  production routing was involved.
- Chromium against that root-wrapper build: 1440×900 and 390×844, responsive heading
  sizes/padding, no phone overflow, search/no-match and keyboard focus styling.
  [Refreshed screenshots](../frontend/app-center.md#root-build-review-correction).

The earlier full-suite result remains from the pre-correction head; the full suite
was not rerun for this isolated build/config correction. Previously reproduced
baseline failures and Draft status remain recorded above. No external review
comments existed when this review began; no additional material findings remained.
