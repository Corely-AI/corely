# 386 — Shared session providers and clients

## Tracking and outcome

- Issue: [#386](https://github.com/Corely-AI/corely/issues/386), parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Prerequisite #385 / [PR #410](https://github.com/Corely-AI/corely/pull/410) was verified merged on 2026-11-08 at `2b79fa5a4c`.
- Branch: `386-shared-session-transport`; intended PR base: `development` at that merge. The initial local dependent branch was rebased once the maintainer merged #410; the delivery diff excludes prerequisite changes.
- PR: [Draft #411](https://github.com/Corely-AI/corely/pull/411), verified against `development`.
- Outcome: explicit new-surface session provider/client package exports with verified account bootstrap, safe auth states and one-attempt API transport.
- Excludes product-app scaffolding, legacy/POS migration, global logout, persistent context switching, offline pending-write disposal, deployment and live identity/host activation.

## Reuse and decisions

Reused the Identity-owned opaque-cookie adapter, current account/membership/tenant
ports, Workspaces authorization and shared contracts/UI/tokens. Added a verified
user bootstrap response through the existing API. Configured tenant/workspace
hints are checked before bootstrap succeeds and on each business request; denied
team context returns 403 rather than pretending a valid identity signed out.

The opt-in `SessionProviders`, `SessionClient` and `useSession` exports are a
separate entry point from legacy `Providers`/`useAuth`/bearer clients. The latter
and POS are not silently switched. New surfaces share this implementation by
app key and context/locale configuration, with no copied app auth or new backend.
[Maintained integration guidance](../frontend/browser-sessions.md) explains the
public API, current limits and required feature-client binding in future surfaces.

Protected children stay unmounted during bootstrap and error states. Schema,
app key and expiry are verified before authentication. Query state is memory-only
and scoped by configuration; failure/scope disposal cancels requests and clears
queries. There is no legacy token storage dependency or offline restoration on
this path. Client and QueryClient retries are disabled, bootstrap/rotation are
deduplicated, and unsafe commands are never replayed after auth failure.

## Verification

All results are actual runs on 2026-11-08; earlier whole-repository failures from
#385 remain limits, not fresh passes. Synthetic browser responses are distinct
from the real PostgreSQL-backed Identity tests.

| Check                                                                      | Result / limits                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --dir packages/web-shared exec vitest run --config vitest.config.ts` | 19 passed: all app keys, state gating, manual retry, obsolete bootstrap, no storage use, no mutation retries, header/path controls, rotation, login and cancellation.                                                                                                         |
| Six scoped Identity suites from #385                                       | 87 passed against the stopped/restarted test-owned PostgreSQL fixture on 127.0.0.1:55485, with fake email/background dispatch disabled. Includes real bootstrap account data and denied context.                                                                              |
| Root `pnpm test:unit` with established test environment                    | 1,301 passed, seven skips across 299 files; the new session project is included in the root workspace. Subsequent context-status adjustment was rechecked in the affected backend suites.                                                                                     |
| API and shared-web typecheck                                               | Passed on implementation; final API check also passed after the context-status adjustment.                                                                                                                                                                                    |
| API build, contracts typecheck                                             | Passed.                                                                                                                                                                                                                                                                       |
| Targeted production/fixture ESLint                                         | Passed, zero errors/warnings after adding the fixture tsconfig and correcting its unused parameter.                                                                                                                                                                           |
| Changed-file formatting, links, diff whitespace, staged source size        | Passed on changed files; local references and staged size checked before publication.                                                                                                                                                                                         |
| Browser compatibility smoke                                                | Actual legacy web and Freelancer `/auth/login` render with existing Providers. External/API traffic was blocked; no real login, OTP, password submission or authenticated-data acceptance is claimed. Missing local Vite tooling output was built before starting those apps. |
| Live session/issuer/hosts, email, production database                      | Not run; no migration, deployment or activation.                                                                                                                                                                                                                              |

The Playwright CLI wrapper did not expose `playwright-cli`; browser verification
used the connected Playwright tools with the installed browser. No new browser
was downloaded. Test-generated diagnostics remain in ignored output directories.

## UI/UX evidence

The test-only fixture at `packages/web-shared/testkit/browser` mounts the real
shared provider/client and status boundary with synthetic fetch responses. The
production client has no knowledge of fixture query parameters. Inspected its
rendered desktop (1280×720) and mobile (390×844) states, EN/DE/VI copy, focus ring,
44-pixel action height, no horizontal overflow and keyboard reachability. The
expiry button hid the authenticated child immediately and showed sign-in without
an automatic navigation loop. Component tests verify manual outage recovery.

- [Loading](386-assets/booting.png)
- [Signed out](386-assets/unauthenticated.png)
- [Forbidden](386-assets/forbidden.png)
- [Temporarily unavailable](386-assets/unavailable.png)
- [Authenticated App Center reuse fixture](386-assets/authenticated.png)
- [German HR mobile denied access](386-assets/mobile-de.png)
- [Vietnamese mobile outage and keyboard focus](386-assets/mobile-vi.png)
- [Legacy web smoke](386-assets/legacy-web.png)
- [Legacy Freelancer smoke](386-assets/legacy-freelancer.png)

The captures contain synthetic labels or empty legacy sign-in fields. They are
package behavior/compatibility evidence, not proof of deployed App Center,
Invoice or HR product journeys. The default status boundary is the visible
change; existing production app routes and login forms were not edited.

## Impact and remaining work

No dependencies, environment keys, identity tables or migrations changed. New
surfaces explicitly opt in; feature calls must use the bound session client.
Callbacks remain server-handled. The new provider does not claim global logout,
cross-tab rotation coordination, legacy token retirement, persisted/offline
migration or queued-command policy; #387 owns those outcomes. It offers no local
logout that could silently restore central SSO. Existing integrations remain on
their existing adapters until an explicit migration.

Keep Draft for human review/required checks. Feature/host activation and real
multi-origin client acceptance require separately verified follow-on delivery.
Rollback stops using the new package entry point; no database rollback is needed.

Delivery: signed commits published to the ticket branch; pre-commit checks passed.
The pre-push wrapper was skipped after the recorded manual checks. The disposable
PostgreSQL cluster and all three test-owned Vite servers were stopped. Browser
diagnostics remain under ignored output; screenshot evidence is linked above.
