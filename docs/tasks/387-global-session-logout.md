# #387 — Global session logout and old-origin retirement

## Tracking and outcome

- [Issue #387](https://github.com/Corely-AI/corely/issues/387), parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Prerequisite #386 integrated through #411 at `366df0955c6a0e7436709b1ba5903dec1285b673`.
- Branch `387-global-session-logout`, based on verified `corely/development` at that commit. Working tree was clean before branching.
- PR: pending publication as Draft against `development`.
- Outcome: Sign out of Corely revokes this central family and linked app sessions; browser cleanup gates stale/restored content and explicitly handles pending legacy offline work.
- Excludes new product clients, global bearer/POS migration, persistent workspace handoff, deployment, shared database changes and forcibly terminating server requests already admitted before logout.

## Reuse and decisions

Extended Identity's existing SSO store/service/HTTP adapter and the shared opt-in
session provider/client. No new storage, dependencies, secrets or migrations.
Family-first locking serializes revocation with rotation and redemption. Audit
and outbox are transactional; duplicate logout with the same handle is harmless.
Expired/access-revoked sessions can sign out, but stale rotated handles fail
rather than revoking an unknown replacement. Other device families remain live.

The initiating app expires its own host-only cookie. The central origin cookie
can remain in the browser, but its family is revoked and cannot silently sign in
again. Every subsequent authenticated request checks revocation/current access.
Existing requests and server streams admitted before commit can finish.

Shared providers hide private content immediately, cancel old reads and clear
queries/mutations. An unconfirmed logout has an explicit retry boundary. Same-origin
messages only invalidate UI. Other origins verify on focus/visibility/history
restore and every 30 foreground seconds, with a 10-second verification deadline.
Browser suspension is not a wall-clock latency guarantee. Pagehide removes
readable DOM before history snapshots; changed account IDs remount children.

Explicit `retireLegacyStorage` clears old-origin tokens/context/cache, preserving
the entire outbox and blocking authenticated UI while any records remain. No
command ownership is inferred or reassigned. An administrator recovers/reconciles
work under the original identity or obtains explicit disposal approval. This
stack never mounts offline replay. Unmigrated legacy origins/POS retain their
existing bearer lifecycle. See [maintained browser policy](../frontend/browser-sessions.md).

## Verification

Actual runs on 2026-11-08 against a test-owned PostgreSQL instance at
127.0.0.1:55485, database `corely_384_surf05`; fixture guards refuse other hosts
or non-disposable names. Email delivery was fake; outbox dispatch was disabled.

| Check                                                             | Result / limits                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared session Vitest config                                      | 32 passed, including failed/logout retry, stale reads, history restoration, revoked membership polling and hung verification.                                                                                                                                                                                    |
| Identity session persistence + transport suites                   | 39 passed, including cross-family isolation, CSRF/origin/method checks, idempotency, transactional rollback and rotation serialization.                                                                                                                                                                          |
| Identity SSO, email, security and transport neighbors             | 52 passed.                                                                                                                                                                                                                                                                                                       |
| Chromium/installed Chrome `global-logout.spec.ts`                 | 3 passed with real TLS cookies, shared providers, central login and PostgreSQL. Invoice logout rejected HR's next request, HR UI expired at its documented foreground recheck, and central-cookie reuse required credentials. Same-origin invalidation, outage/retry and actual IndexedDB migration also passed. |
| Existing `central-login.spec.ts`                                  | 7 passed on a fresh fixture account.                                                                                                                                                                                                                                                                             |
| Shared-web and API typecheck                                      | Passed.                                                                                                                                                                                                                                                                                                          |
| Targeted ESLint                                                   | Passed production/provider/fixture files; E2E files follow the repository's existing ignore rule.                                                                                                                                                                                                                |
| Root unit suite                                                   | Pending final result.                                                                                                                                                                                                                                                                                            |
| Installed Prettier, local documentation references and whitespace | Passed for changed files and maintained local links before publication.                                                                                                                                                                                                                                          |
| `pnpm arch:check`                                                 | Fails before checks with ENOENT for absent `services/worker/src`. The unchanged checker still references that removed runtime; no worker was recreated.                                                                                                                                                          |

The initial browser run exposed a real null-body response incompatibility: Chromium
exposed an empty stream on successful 204 logout, and reconstructing it with
`new Response(stream, {status: 204})` threw and incorrectly displayed an outage.
The client now preserves null-body status responses; a regression models this
and the real browser logout passes. Another aggregate run reused an account
whose credential budget had been consumed during debugging; it failed with rate
limits. Fresh fixture runs above passed without weakening production budgets.
The fixture static asset mount was corrected before the verified runs.

## UI/UX evidence

Inspected the real shared boundary with synthetic account data: desktop 1280×720,
phone 390×844, English/German/Vietnamese copy, keyboard reachability and no
horizontal overflow. Browser assertions also exercised login after revocation
and an explicit retry after an outage. Screenshots are review evidence for the
shared implementation, not deployed Invoice/HR product screens.

- [Authenticated desktop fixture](387-assets/authenticated-desktop.png)
- [Confirmed sign-out](387-assets/signed-out-desktop.png)
- [Revoked HR phone](387-assets/revoked-hr-mobile.png)
- [Unconfirmed logout desktop](387-assets/logout-failed-desktop.png)
- [Unconfirmed logout phone](387-assets/logout-failed-mobile.png)
- [Keyboard action on phone](387-assets/logout-failed-mobile-focused.png)
- [German phone](387-assets/logout-failed-mobile-de.png)
- [Vietnamese phone](387-assets/logout-failed-mobile-vi.png)
- [Offline migration blocked](387-assets/migration-blocked.png)

## Impact and remaining work

Draft for human review and required checks. No merge, deployment, production
activation or real messaging. Browser coverage used Chromium; no new WebKit
acceptance is claimed. New product surfaces and their real hosting remain with
follow-on tickets. Existing legacy bearer sessions are not centrally revoked by
this family logout; each origin must be deliberately retired at its cutover.
Rollback stops opting into the session provider; require fresh legacy login,
never restore retired tokens or revoked families.
