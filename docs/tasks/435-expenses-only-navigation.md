# Expenses-only navigation

## Outcome and delivery

[Issue #435](https://github.com/Corely-AI/corely/issues/435) requests the same
focused business navigation as Invoice: opening Expenses shows only Expenses.
The existing `/expenses`, `/expenses/new`, `/expenses/:id` and
`/expenses/:id/edit` screens now share an Expenses shell within `apps/web`.

[Draft PR #436](https://github.com/Corely-AI/corely/pull/436) contains this change.

Branch `435-expenses-only-navigation` is stacked on
`433-invoice-only-navigation` while [PR #434](https://github.com/Corely-AI/corely/pull/434)
remains open. The verified remote default is `development` at `f7d3f822`.
Retarget and recheck the incremental diff after the prerequisite integrates.

## Reuse and scope

The Expenses domain, contracts, list/form/detail screens, API client and routes
already exist. Reuse the shared AppShell and its desktop/mobile sidebar and
command palette. Filter the workspace's existing authorized navigation to the
Expenses item and safe `/expenses` routes. Loading/error states show no stale
navigation; a missing grant does not create a fallback link. Suppress unrelated
workspace quick actions and platform administration entries in this shell.

Existing web authentication, workspace selection and expense operations remain
with their current owners. The normal web sidebar remains on other routes.
This presentation change does not create new backend authorization, a service,
a host, copied business screens or a database migration.

For a return link, set the public build variable
`VITE_CORELY_APP_CENTER_ORIGIN=https://app.corely.test:8443` in
`apps/web/.env.local` (or the equivalent build environment). Only a validated
exact origin is accepted. The link carries the active workspace hint and
EN/DE/VI locale, without credentials. Invalid or absent configuration omits it.

## Verification

- Regression before implementation: six new checks failed on broad/stale menus;
  three unrelated-route checks passed.
- Targeted web tests: 26 passed across the Expenses shell, original sidebar,
  workspace navigation/scope and authentication return path suites.
- Browser suite: seven passed. Dedicated config:
  `pnpm --dir apps/e2e exec playwright test --config playwright.expenses-shell.config.ts`.
  It starts an isolated Vite server on loopback port 5198, uses synthetic
  authentication and route-mocked API records, and performs no real writes.
- Full web typecheck reports existing errors in untouched Tenant Management,
  Assistant, Cash and Invoice code. The final E2E typecheck reports 39 errors
  outside the new shell/configuration, including the general Playwright
  configuration's existing optional-worker typing. Neither is a clean gate.
- Changed-file ESLint, Prettier and whitespace checks passed. The mobile check
  passed again after disabling animations for its evidence capture.
- The regular pre-push run finished with 329 passing files, one failed suite,
  1,520 passing tests and eight skipped. The unchanged Cash Management
  `confirm-handoff.integration.spec.ts` fails with
  `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`.
  Later broad hook stages did not run. Draft publication uses the hook's
  documented `HUSKY=0` override; the full gate is not claimed passed.

The browser suite covers all four routes, loaded expense details/edit values,
the keyboard palette, reload, App Center return URL, phone drawer selection and
the absence of ungranted navigation. Unit checks cover loading/error and other
web routes as well as unsafe return origins.

## UI/UX evidence and limits

Manual inspection in Chrome profile **Ha - XYZ**, with the existing synthetic
Smoke account/workspace and live local API, verified App Center entry, the empty
Expenses list, Add expense, Cancel and the App Center return. The shell retained
one Expenses business link throughout. No expense was saved. A final repeated
App Center launch could not be inspected after the browser connection became
unavailable; it is not counted as a successful repeat.

The automated captures use synthetic records, English, desktop 1280×720 and phone
390×844. They prove rendered menu scope, not production authentication or a full
accessibility audit.

- [Desktop Expenses list](../frontend/images/expenses-only-navigation/expenses-desktop.png)
- [Phone Expenses navigation](../frontend/images/expenses-only-navigation/expenses-mobile.png)

No release, merge or deployment was performed.
