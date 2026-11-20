# 433 — Invoice-only navigation from App Center

## Tracking and outcome

- [Issue #433](https://github.com/Corely-AI/corely/issues/433); follows #431, #394 and #396.
- Branch: `433-invoice-only-navigation`; base: `origin/development` at `f7d3f822`.
- [Draft PR #434](https://github.com/Corely-AI/corely/pull/434).
- Goal: App Center opens the existing focused Invoice client, whose business
  navigation contains only invoices, with authorized workspace and language intent.
- Excludes new invoice screens, HR activation, schema changes and deployment.

## Reuse and decisions

The existing Invoice shell, router and server-side menu context already restrict
navigation to invoices. The observed launch went to the broad legacy admin route
because focused Invoice availability remained gated. Add the explicit
`CORELY_LAUNCH_INVOICE_ENABLED` API option, disabled by default, and opt in through
the local focused-development runner. An explicit local `false` supports rollback.

Opted-in catalogs omit Invoice's legacy directory destination. A missing focused
origin therefore stays unavailable rather than exposing a broad fallback. Existing
tenant enablement, dependency, membership, permission and workspace checks remain
in the catalog/menu/session pipeline. HR and other directory destinations retain
their existing gates and behavior.

## Verification

| Check                                                      | Result and limits                                                                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regression before implementation                           | New catalog opt-in test failed: received coming-soon instead of the focused origin.                                                                      |
| API catalog, origins, launches, focused menu/config suites | 30 passed.                                                                                                                                               |
| Local focused configuration suite                          | 15 passed, including explicit rollback.                                                                                                                  |
| App Center suite, including production asset build         | 28 passed.                                                                                                                                               |
| Shared focused navigation/shell and Invoice link suites    | 41 passed.                                                                                                                                               |
| Existing Invoice browser tests                             | 3 passed: list/bookmarked detail/edit/activity, dirty-form and unrelated-route rejection, empty/missing/denied states. Route-mocked synthetic transport. |
| API, config, Invoice and App Center typechecks             | Passed.                                                                                                                                                  |
| Live API/catalog                                           | HTTP 200; Invoice available at its configured HTTPS origin with no legacy directory; other module destinations retained.                                 |
| Live Chrome, Ha - XYZ                                      | App Center → Invoice → central session reuse → invoice-only sidebar; reload retains the session and workspace; All apps returns to App Center.           |
| Existing focused UX accessibility test, English            | Failed on `label-content-name-mismatch` at the unchanged Language control. No claim that accessibility verification is clean; keep PR Draft.             |

## UI/UX evidence

The normal pre-push unit check completed with 328 passing files, one failed
suite, 1,508 passing tests and eight skipped tests. The unchanged Cash Management
`confirm-handoff.integration.spec.ts` fails with
`SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`. Later broad
hook checks did not run. The branch was published as Draft using the hook's
documented `HUSKY=0` override; the full pre-push gate is not claimed passed.

Changed-file ESLint, Prettier, whitespace and local documentation links passed.
`pnpm arch:check` reports existing Prisma boundary violations in untouched files;
none of the changed files appears in its failure list.

Actual browser inspection used the local HTTPS gateway, shared API and synthetic
Smoke account/workspace. The first Invoice visit explicitly started sign-in and
reused the central session; subsequent visits needed no credential entry. A
temporary local API hot-restart interrupted the All apps return; retry after API
health recovery succeeded.

Representative existing Playwright captures use route-mocked synthetic records:

- [Invoice list, 1280×720, English](../frontend/images/invoice-only-navigation/invoice-list-desktop.png).
- [Invoice activity, 390×844, English](../frontend/images/invoice-only-navigation/invoice-activity-mobile.png).

The desktop shell has one business link, Invoices. The phone layout retains the
Invoice identity, app controls and invoice activity without unrelated navigation.
Automated unrelated-route checks cover HR, Tasks, Accounting and unsupported audit
targets. These captures do not claim live-data end-to-end or full accessibility
coverage.

## Impact and remaining work

Production defaults remain unchanged. Configure the approved focused origin and
SSO routing before opting another environment in. Disabling the flag and
restarting the API restores the legacy launch without changing invoice records.
The broader release and accessibility gates remain separate work.
