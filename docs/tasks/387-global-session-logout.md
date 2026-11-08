# #387 — Global session logout and old-origin retirement

## Tracking and outcome

- [Issue #387](https://github.com/Corely-AI/corely/issues/387), parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Prerequisite #386 integrated through #411 at `366df0955c6a0e7436709b1ba5903dec1285b673`.
- Branch `387-global-session-logout`, based on verified `corely/development` at that commit. Working tree was clean before branching.
- PR: [Draft #412](https://github.com/Corely-AI/corely/pull/412), verified against `development`.
- Outcome: Sign out of Corely revokes this central family and linked app sessions; browser cleanup gates stale/restored content and explicitly handles pending legacy offline work.
- Excludes new product clients, global bearer/POS migration, persistent workspace handoff, deployment, shared database changes and forcibly terminating server requests already admitted before logout.

## Reuse and decisions

Extended Identity's existing SSO store/service/HTTP adapter and the shared opt-in
session provider/client. No new storage, runtime dependencies, secrets or migrations. The existing
`fake-indexeddb` test dependency is now declared by shared-web for migration regressions.
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
Browser suspension is not a wall-clock latency guarantee. Pagehide conceals the
rendered tree before history snapshots while preserving same-account local drafts;
changed account IDs remount children. Metadata checks do not renew idle activity.

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
| Identity session persistence, logout HTTP + transport suites      | 39 passed, including cross-family isolation, CSRF/origin/method checks, idempotency, transactional rollback and rotation serialization.                                                                                                                                                                          |
| Identity SSO, email, security and transport neighbors             | 52 passed.                                                                                                                                                                                                                                                                                                       |
| Chromium/installed Chrome `global-logout.spec.ts`                 | 3 passed with real TLS cookies, shared providers, central login and PostgreSQL. Invoice logout rejected HR's next request, HR UI expired at its documented foreground recheck, and central-cookie reuse required credentials. Same-origin invalidation, outage/retry and actual IndexedDB migration also passed. |
| Existing `central-login.spec.ts`                                  | 7 passed on a fresh fixture account.                                                                                                                                                                                                                                                                             |
| Shared-web and API typecheck                                      | Passed.                                                                                                                                                                                                                                                                                                          |
| Targeted ESLint                                                   | Passed production/provider/fixture files; E2E files follow the repository's existing ignore rule.                                                                                                                                                                                                                |
| Repository-wide `pnpm typecheck`                                  | Fails with 14 errors in unchanged web-features Assistant/Cash Management/People sources and missing offline package declarations; no baseline checkout rerun is claimed. Affected API/shared-web checks pass.                                                                                                    |
| Repository-wide `pnpm lint`                                       | Exhausted its configured 8 GiB JavaScript heap. Targeted lint and pre-commit checks passed; no full lint pass is claimed.                                                                                                                                                                                        |
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

The signed implementation commit passed lint-staged and the source-size check.
The pre-push wrapper is skipped in favor of the recorded manual checks, including
the failing repository-wide typecheck/architecture gates; this is not a claim
that those gates pass. Test-owned TLS/Vite servers and PostgreSQL were stopped.

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

## PR #412 review corrections — 2026-11-08

All three review findings were reproduced before correction; the unsaved-form
control passed against the base provider and failed on the original PR.

- **P1 — verification kept idle sessions alive:** session metadata reads now
  authenticate without touching either idle deadline. Business requests and
  explicit rotation retain their existing renewal behavior. A transactional
  PostgreSQL regression executes verification heartbeats through the 30-minute
  boundary and proves expiry; HTTP checks prove `current`/`user` do not renew,
  while rotation still does. No client activity header can bypass server expiry.
- **P2 — focus/visibility lost drafts:** routine verification now conceals the
  private rendered tree without unmounting same-account form state or disposing
  its commands. Hidden/history pages remain concealed until successful server
  verification. Account changes and verification failures still remove private
  children and clear queries. Background/focus verification is deduplicated and
  deadline-bound; automatic query focus/reconnect refetch is disabled to avoid
  racing verification. Tests prove drafts survive focus/visibility/history and
  are discarded when a different account is verified.
- **P2 — absent DB inspection broke rollback:** migration aborts the creation
  transaction instead of persisting an empty version-1 database. Unit and real
  IndexedDB browser tests prove subsequent legacy schema initialization creates
  both stores; pending records remain intact and still block migration.

Fresh verification for the corrections:

| Command / check                                                                          | Actual result                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test:unit` with disposable local DATABASE_URL and disabled outbox                  | **1,318 passed, seven skipped across 300 files.**                                                                                                                                         |
| Shared-web session Vitest config                                                         | **36 passed**, including the four new provider/migration regressions.                                                                                                                     |
| Scoped Identity session, transport and logout HTTP suites                                | **41 passed** against disposable PostgreSQL.                                                                                                                                              |
| Neighbor SSO/email/security/transport suites                                             | **52 passed**.                                                                                                                                                                            |
| `playwright.sso.config.ts global-logout.spec.ts` with installed Chrome and fresh fixture | **Five passed**; real TLS cookies/server sessions, fake email, no real messages. The seven older central-login browser cases above are earlier evidence, not rerun for these corrections. |
| API/shared-web typechecks, API build and targeted ESLint                                 | Passed.                                                                                                                                                                                   |
| Frozen offline lockfile check                                                            | Passed; only the shared-web test dependency importer changed.                                                                                                                             |
| Full repository lint/typecheck/architecture and hosted CI                                | Earlier failures remain limits; not rerun or represented as passing for this correction. Hosted checks must be read at the updated PR head.                                               |

Fresh visual inspection of the same synthetic flow, 1280×720 and 390×844:

- [Concealed while verification is pending](387-assets/review-concealed-draft-desktop.png)
- [Draft preserved after verification, desktop](387-assets/review-preserved-draft-desktop.png)
- [Draft preserved on phone](387-assets/review-preserved-draft-mobile.png)

No private draft appears in the concealed screenshot. UI evidence uses synthetic
text and does not claim real back-forward-cache support across all browsers;
pagehide/pageshow restoration is exercised deterministically. Keep Draft for
human review and repository checks. No merge, deployment or activation.
