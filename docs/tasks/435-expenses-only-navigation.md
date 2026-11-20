# Expenses-only navigation

## Outcome and delivery

[Issue #435](https://github.com/Corely-AI/corely/issues/435) requests the same
focused business navigation as Invoice: opening Expenses shows only Expenses.
The existing `/expenses`, `/expenses/new`, `/expenses/:id` and
`/expenses/:id/edit` screens now share an Expenses shell within `apps/web`.

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
- Full web and E2E typechecks report existing errors in untouched files. These
  are not clean gates; details and any hook failures are recorded in the PR.
- Changed-file ESLint, Prettier and whitespace checks passed. The E2E fixture's
  missing widget metadata was corrected during verification.

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
